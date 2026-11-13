// Set up the board (lab prototype): the friends are mixed up in the middle of
// a real 8x8 board and the kid puts each one on a starting square of its kind.
// The gray side at the top is already set up and asleep: it is the picture to
// copy. Rules are in src/core/setup.ts.
//
// Two ways to help, compared in the lab:
//   ghosts  a faint friend waits on every square still to fill, and the picked
//           friend's squares get a ring
//   copy    nothing is shown: look at the sleeping side and copy it
// Either way a friend put on a wrong home square just hops back, and after a
// quiet spell the hint hand shows a right one.
//
// The reveal: when the whole side of sixteen stands (not just a few of them),
// the meadow turns into a wooden chessboard and the friends turn ivory,
// keeping their faces. The kid is looking at a real chess set.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IVORY, WOOD } from '../content/looks.ts';
import { BOARD, makeSetup, setupDrop, setupStart, setupTargets, setupWon, type SetupLevel, type SetupState } from '../core/setup.ts';
import type { GameState, Puzzle } from '../core/types.ts';
import { AgainIcon, FriendArt, GoIcon, GRUMPY, HomeIcon } from './art.tsx';
import { Board, type FriendMood } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { moveDuration, REWIND_MS } from './motion.ts';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
const BOUNCE_MS = 520;
/** After the win, the dance goes on this long before the reveal. */
const REVEAL_MS = 1400;

const EMPTY_BOARD: Puzzle = { rows: BOARD, cols: BOARD, rocks: Array(BOARD * BOARD).fill(false), treats: [], friends: [] };

const distance = (a: number, b: number) =>
  Math.max(Math.abs((a % BOARD) - (b % BOARD)), Math.abs(Math.floor(a / BOARD) - Math.floor(b / BOARD)));

export function SetupScreen({ level, seed, ghosts, sky, eagerHint, top, onNext, onHome }: {
  level: SetupLevel;
  /** Picks how the friends start scattered. */
  seed: number;
  /** Show a faint friend on every square still to fill. */
  ghosts: boolean;
  sky: string;
  eagerHint?: boolean;
  top?: ReactNode;
  onNext?: () => void;
  onHome: () => void;
}) {
  const later = useTimers();
  const puzzle = useMemo(() => makeSetup(level, seed), [level, seed]);
  const [game, setGame] = useState<SetupState>(() => setupStart(puzzle));
  /** A friend shown on a wrong square for a moment before it hops back. */
  const [stray, setStray] = useState<{ fi: number; at: number } | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  /** The whole side stands: wooden board, ivory friends. */
  const [revealed, setRevealed] = useState(false);
  const wholeSide = puzzle.loose.length + puzzle.fixed.length === 2 * BOARD;
  const [mood, setMood] = useState<FriendMood>('idle');
  const [motion, setMotion] = useState<'normal' | 'rewind'>('normal');
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const dragFrom = useRef<number | null>(null);

  // The board draws the loose friends first (so their indexes match), then the ones already home.
  const state: GameState = useMemo(() => ({
    friends: [
      ...puzzle.loose.map((f, i) => ({ kind: f.kind, at: stray?.fi === i ? stray.at : game.at[i] })),
      ...puzzle.fixed,
    ],
    left: 0,
  }), [puzzle, game, stray]);

  const targets = useMemo(
    () => (busy || won || game.home[selected] !== false ? [] : setupTargets(puzzle, game, selected)),
    [busy, won, puzzle, game, selected],
  );

  // Idle hint: the hand taps the picked friend's nearest free square.
  useEffect(() => {
    if (won || busy || targets.length === 0) return;
    const t = window.setTimeout(() => {
      const from = game.at[selected];
      setHint([...targets].sort((a, b) => distance(from, a) - distance(from, b))[0]);
    }, eagerHint ? EAGER_HINT_MS : HINT_MS);
    return () => window.clearTimeout(t);
  }, [won, busy, eagerHint, targets, game, selected, idleKey]);

  const drop = (fi: number, to: number) => {
    const kind = puzzle.loose[fi].kind;
    const res = setupDrop(puzzle, game, fi, to);
    if (res.kind === 'no') {
      setNudgeKey((n) => n + 1);
      sfx.nudge();
      return;
    }
    const travel = moveDuration(kind, distance(game.at[fi], to));
    setSelected(fi);
    setBusy(true);
    setNudgeKey(0);
    setPokeKey(0);
    sfx.hop(kind);
    if (res.kind === 'wrong') {
      // Not its square: it lands, looks around, and hops back. Never a "wrong" buzzer.
      setStray({ fi, at: to });
      later(() => sfx.nudge(), travel);
      later(() => { setStray(null); sfx.hop(kind); }, travel + BOUNCE_MS);
      later(() => { setBusy(false); setIdleKey((n) => n + 1); }, travel + BOUNCE_MS + travel);
      return;
    }
    setGame(res.state);
    const homeCount = res.state.home.filter(Boolean).length;
    later(() => sfx.munch(homeCount - 1), Math.round(travel * 0.85));
    later(() => {
      if (setupWon(res.state)) {
        setWon(true);
        setMood('dance');
        sfx.win();
        if (wholeSide) later(() => { setRevealed(true); setMood('idle'); sfx.promote(); }, REVEAL_MS);
        later(() => setShowGo(true), wholeSide ? REVEAL_MS + 900 : 1100);
        return;
      }
      // Pick the next friend still waiting, so there is always someone to place.
      setSelected(res.state.home.findIndex((h) => !h));
      setBusy(false);
    }, travel + 150);
  };

  const again = () => {
    wakeAudio();
    if (busy && !won) return;
    later.clear(); // nothing an old win had planned may land on the fresh board
    setWon(false);
    setShowGo(false);
    setRevealed(false);
    setMood('idle');
    setMotion('rewind');
    setGame(setupStart(puzzle));
    setStray(null);
    setSelected(0);
    setHint(null);
    setRound((n) => n + 1);
    setBusy(true);
    sfx.rewind();
    later(() => {
      setBusy(false);
      setMotion('normal');
    }, REWIND_MS);
  };

  const looseAt = (pos: number) => game.at.findIndex((at, i) => at === pos && !game.home[i]);

  const press = (pos: number) => {
    wakeAudio();
    if (won || busy) return;
    setHint(null);
    setIdleKey((n) => n + 1);
    const fi = looseAt(pos);
    if (fi >= 0) {
      setSelected(fi);
      setPokeKey((n) => n + 1);
      dragFrom.current = fi;
      sfx.select(puzzle.loose[fi].kind);
      return;
    }
    dragFrom.current = null;
    if (game.home[selected] === false) drop(selected, pos);
  };

  // Dragging a friend onto its square works too.
  const release = (pos: number) => {
    const fi = dragFrom.current;
    dragFrom.current = null;
    if (fi === null || won || busy || pos === game.at[fi]) return;
    drop(fi, pos);
  };

  const cell = (pos: number): CSSProperties => ({
    left: `${((pos % BOARD) * 100) / BOARD}%`,
    top: `${(Math.floor(pos / BOARD) * 100) / BOARD}%`,
    width: `${100 / BOARD}%`,
    height: `${100 / BOARD}%`,
  });

  // Squares still to fill, with the kind that belongs there.
  const open = useMemo(() => {
    const out = new Map<number, typeof puzzle.loose[number]['kind']>();
    puzzle.loose.forEach((f, i) => {
      if (!game.home[i]) for (const sq of setupTargets(puzzle, game, i)) out.set(sq, f.kind);
    });
    return out;
  }, [puzzle, game]);

  const extra = (
    <>
      {puzzle.model.map((g) => (
        <div key={`m${g.at}`} className="guard" style={cell(g.at)}>
          <FriendArt kind={g.kind} colors={GRUMPY} mood={won ? 'happy' : 'sleepy'} className="fill" />
        </div>
      ))}
      {ghosts && [...open].map(([sq, kind]) => (
        <div key={`o${sq}`} className="setup-ghost" style={cell(sq)}>
          <FriendArt kind={kind} mood="sleepy" className="fill" />
        </div>
      ))}
    </>
  );

  return (
    <div className="screen play" style={{ background: sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="dots-row">{top}</div>
        <button className="round-btn" onClick={again} aria-label="Start over">
          <AgainIcon className="icon" />
        </button>
      </div>

      <div className="board-wrap">
        <Board
          puzzle={EMPTY_BOARD}
          state={state}
          treat="berry"
          theme={revealed ? WOOD : undefined}
          dress={revealed ? IVORY : null}
          selected={won ? null : selected}
          hops={ghosts ? targets : []}
          rings={targets}
          hint={hint}
          mood={mood}
          gulp={null}
          motion={motion}
          round={round}
          nudgeKey={nudgeKey}
          pokeKey={pokeKey}
          extra={extra}
          onPress={press}
          onRelease={release}
        />
        {won && <Confetti />}
      </div>

      <div className="bottombar">
        {showGo && (
          <button
            className="go-btn"
            onClick={() => { sfx.tap(); if (onNext) onNext(); else again(); }}
            aria-label={onNext ? 'Next puzzle' : 'Play again'}
          >
            {onNext ? <GoIcon className="icon-lg" /> : <AgainIcon className="icon-lg invert" />}
          </button>
        )}
      </div>
    </div>
  );
}

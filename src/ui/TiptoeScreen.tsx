// Sneak screens: tiptoe puzzles (sneak past sleepy guards to the treats) and
// the pawn walk (get the little pawn home to the gold top row, sometimes
// racing a gray guard pawn to the bottom). Rules live in src/core/sneak.ts.
// Land where a guard is watching and he wakes up, shows what he watches, and
// your friend scurries back. Boop a guard by landing on him from a square he
// does not watch.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  isRacer, mustParseSneak, stillRacing, sneakHop, sneakHops, sneakStart, sneakWon, solveSneak, watchedSquares,
  type SneakRules, type SneakState,
} from '../core/sneak.ts';
import { TIPTOE_SKY } from '../content/tiptoe.ts';
import { AgainIcon, FriendArt, GoIcon, GRUMPY, HomeIcon } from './art.tsx';
import { Board, type FriendMood } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { moveDuration, REWIND_MS } from './motion.ts';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

/** How much of what the guards watch is shown before anything wakes up. */
export type Peek = 'never' | 'dots' | 'always';

const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
const WAKE_MS = 1500;
/** A racing gray pawn takes its step this long after the friend lands. */
const STEP_MS = 250;

export function TiptoeScreen({ grid, rules, sky = TIPTOE_SKY, peek, eagerHint, top, onWin, onNext, onHome }: {
  grid: readonly string[];
  /** Default: tiptoe (eat every treat, guards stay put). */
  rules?: Partial<SneakRules>;
  sky?: string;
  peek: Peek;
  eagerHint?: boolean;
  /** Middle of the top bar (the lab puts its controls here). */
  top?: ReactNode;
  onWin?: () => void;
  onNext?: () => void;
  onHome: () => void;
}) {
  const later = useTimers();
  const goal = rules?.goal;
  const race = rules?.race;
  const puzzle = useMemo(() => mustParseSneak(grid, { goal, race }), [grid, goal, race]);
  const [game, setGame] = useState<SneakState>(() => sneakStart(puzzle));
  /** What the board draws: the real game, or the friend caught on a watched square. */
  const [shown, setShown] = useState<SneakState | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [mood, setMood] = useState<FriendMood>('idle');
  const [motion, setMotion] = useState<'normal' | 'rewind'>('normal');
  const [round, setRound] = useState(0);
  const [gulp, setGulp] = useState<{ index: number; delay: number } | null>(null);
  const [awake, setAwake] = useState<{ guards: number[]; squares: number[] } | null>(null);
  /** Racing guard pawns that just got home first. */
  const [cheer, setCheer] = useState<number[]>([]);
  const [booped, setBooped] = useState<number | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const dragFrom = useRef<number | null>(null);

  const hops = useMemo(
    () => (busy || won || !game.friends[selected] ? [] : sneakHops(puzzle, game, selected)),
    [busy, won, puzzle, game, selected],
  );
  const wakers = useMemo(
    () => new Set(peek === 'dots' ? hops.filter((to) => sneakHop(puzzle, game, { friend: selected, to }).kind === 'wake') : []),
    [peek, hops, puzzle, game, selected],
  );
  const guardRings = useMemo(
    () => puzzle.guards.flatMap((_, gi) => ((game.guards >> gi) & 1 ? [game.gpos[gi]] : [])),
    [puzzle, game],
  );

  useEffect(() => {
    if (won || busy) return;
    const t = window.setTimeout(() => {
      const res = solveSneak(puzzle, game);
      if (res.status !== 'solved' || res.moves.length === 0) return;
      const m = res.moves[0];
      setHint(m.friend === selected ? m.to : game.friends[m.friend].at);
    }, eagerHint ? EAGER_HINT_MS : HINT_MS);
    return () => window.clearTimeout(t);
  }, [won, busy, eagerHint, puzzle, game, selected, idleKey]);

  const distance = (a: number, b: number) =>
    Math.max(Math.abs((a % puzzle.cols) - (b % puzzle.cols)), Math.abs(Math.floor(a / puzzle.cols) - Math.floor(b / puzzle.cols)));

  const move = (fi: number, to: number) => {
    const from = game.friends[fi];
    const travel = moveDuration(from.kind, distance(from.at, to));
    const arrive = Math.round(travel * 0.85);
    const res = sneakHop(puzzle, game, { friend: fi, to });
    setSelected(fi);
    setBusy(true);
    setMotion('normal');
    setNudgeKey(0);
    setPokeKey(0);
    sfx.hop(from.kind);

    if (res.kind === 'beaten') {
      // Hop there, the gray pawn takes its last step home and cheers, and everyone starts over.
      setShown(res.hopped);
      later(() => { setShown(res.shown); sfx.hop('pawn'); }, arrive + STEP_MS);
      later(() => { setCheer(res.by); setMood('confused'); sfx.uhoh(); }, arrive + 2 * STEP_MS);
      later(() => rewind(), arrive + 2 * STEP_MS + 1300);
      return;
    }

    if (res.kind === 'wake') {
      // Hop there (nothing gets eaten), maybe a gray pawn steps, the guard wakes and shows his
      // lines, and the friend scurries home.
      const step = res.walked.length > 0 ? STEP_MS : 0;
      setShown(step ? { ...res.shown, gpos: game.gpos } : res.shown);
      if (step) later(() => { setShown(res.shown); sfx.hop('pawn'); }, arrive + step);
      later(() => {
        setAwake({ guards: res.by, squares: res.watched });
        setMood('confused');
        sfx.shoo();
      }, arrive + step);
      later(() => {
        setShown(null);
        setMood('idle');
        sfx.hop(from.kind);
      }, arrive + step + 700);
      later(() => {
        setAwake(null);
        sfx.snore();
        setBusy(false);
        setIdleKey((n) => n + 1);
      }, arrive + step + WAKE_MS);
      return;
    }

    const step = res.walked.length > 0 ? STEP_MS : 0;
    setGame(step ? res.hopped : res.state);
    if (step) later(() => { setGame(res.state); sfx.hop('pawn'); }, arrive + step);
    if (res.ate >= 0) {
      setGulp({ index: res.ate, delay: arrive });
      later(() => sfx.munch(puzzle.treats.length - popCount(res.state.left) - 1), arrive);
    }
    if (res.booped >= 0) {
      later(() => { setBooped(res.booped); sfx.promote(); }, arrive);
    }
    if (res.promoted) later(() => sfx.promote(), travel);
    later(() => {
      setBooped(null);
      if (sneakWon(puzzle, res.state)) {
        setWon(true);
        setMood('dance');
        sfx.win();
        onWin?.();
        later(() => setShowGo(true), 1100);
        return;
      }
      if (solveSneak(puzzle, res.state).status === 'stuck' && !stillRacing(puzzle, res.state)) {
        setMood('confused');
        sfx.uhoh();
        later(() => rewind(), 1000);
        return;
      }
      setBusy(false);
    }, travel + 450 + step);
  };

  const rewind = () => {
    setMood('idle');
    setMotion('rewind');
    setGame(sneakStart(puzzle));
    setShown(null);
    setAwake(null);
    setCheer([]);
    setSelected(0);
    setGulp(null);
    setHint(null);
    setRound((n) => n + 1);
    setBusy(true);
    sfx.rewind();
    later(() => {
      setBusy(false);
      setMotion('normal');
    }, REWIND_MS);
  };

  const again = () => {
    wakeAudio();
    if (busy && !won) return;
    setWon(false);
    setShowGo(false);
    rewind();
  };

  const friendAt = (pos: number) => game.friends.findIndex((f) => f.at === pos);

  const press = (pos: number) => {
    wakeAudio();
    if (won || busy) return;
    setHint(null);
    setIdleKey((n) => n + 1);
    const fi = friendAt(pos);
    if (fi >= 0) {
      setSelected(fi);
      setPokeKey((n) => n + 1);
      dragFrom.current = fi;
      sfx.select(game.friends[fi].kind);
      return;
    }
    dragFrom.current = null;
    if (hops.includes(pos)) {
      move(selected, pos);
      return;
    }
    setNudgeKey((n) => n + 1);
    sfx.nudge();
  };

  const release = (pos: number) => {
    const fi = dragFrom.current;
    dragFrom.current = null;
    if (fi === null || won || busy) return;
    if (friendAt(pos) === fi) return;
    if (sneakHops(puzzle, game, fi).includes(pos)) move(fi, pos);
  };

  const cell = (pos: number): CSSProperties => ({
    left: `${((pos % puzzle.cols) * 100) / puzzle.cols}%`,
    top: `${(Math.floor(pos / puzzle.cols) * 100) / puzzle.rows}%`,
    width: `${100 / puzzle.cols}%`,
    height: `${100 / puzzle.rows}%`,
  });

  const quiet = peek === 'always' && !busy && !won ? [...watchedSquares(puzzle, game)] : [];
  const board = shown ?? game;
  const band = (row: number): CSSProperties => ({
    left: 0, width: '100%', top: `${(row * 100) / puzzle.rows}%`, height: `${100 / puzzle.rows}%`,
  });
  const extra = (
    <>
      {puzzle.goal === 'home' && <div className="home-row" style={band(0)} />}
      {puzzle.race && <div className="home-row rival" style={band(puzzle.rows - 1)} />}
      {quiet.map((sq) => <div key={`q${sq}`} className="watch-zone quiet" style={cell(sq)} />)}
      {awake?.squares.map((sq) => <div key={`w${sq}`} className="watch-zone awake" style={cell(sq)} />)}
      {[...wakers].map((sq) => <div key={`z${sq}`} className="watch-zone dot" style={cell(sq)} />)}
      {puzzle.guards.map((g, gi) => {
        const here = ((board.guards >> gi) & 1) === 1;
        if (!here && booped !== gi) return null;
        const isAwake = awake?.guards.includes(gi) ?? false;
        const cheering = cheer.includes(gi);
        const cls = `guard ${isRacer(puzzle, gi) ? 'racer' : ''} ${isAwake ? 'awake' : ''} ${cheering ? 'cheer' : ''} ${booped === gi ? 'booped' : ''}`;
        const face = isAwake ? 'grumpy' : cheering ? 'wow' : isRacer(puzzle, gi) ? 'happy' : 'sleepy';
        return (
          <div key={`g${gi}`} className={cls} style={cell(board.gpos[gi])}>
            <FriendArt kind={g.kind} colors={GRUMPY} mood={face} className="fill" />
          </div>
        );
      })}
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
          puzzle={puzzle}
          state={shown ?? game}
          treat="berry"
          selected={selected}
          hops={hops}
          hint={hint}
          mood={mood}
          gulp={gulp}
          motion={motion}
          round={round}
          nudgeKey={nudgeKey}
          pokeKey={pokeKey}
          extra={extra}
          rings={guardRings}
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

function popCount(n: number): number {
  let c = 0;
  for (let x = n; x; x &= x - 1) c++;
  return c;
}

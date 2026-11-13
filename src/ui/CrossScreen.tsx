// Cross with a team (lab prototype): bring every friend to a gold home square.
// Rules are in src/core/cross.ts. With "spots" on, picking a friend makes each
// gold home spot answer "can this friend ever land here, however many hops?":
// yes = a faint ghost of the friend waits in it; never = the spot goes gray
// and dashed (the bishop's other color, a square the rocks cut off), and
// shakes "no" when tapped. With "steps" on as well, a spot the friend can
// reach also shows footprints: one for each hop that friend needs, alone.

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { crossHop, crossHops, crossStart, crossWon, mustParseCross, reachSteps, solveCross } from '../core/cross.ts';
import type { GameState } from '../core/types.ts';
import { AgainIcon, FriendArt, GoIcon, HomeIcon } from './art.tsx';
import { Board, type FriendMood } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { moveDuration, REWIND_MS } from './motion.ts';
import { sfx, wakeAudio } from './sound.ts';
import { useTimers } from './timers.ts';

export const CROSS_SKY = '#fae8ff';
const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;

/** More footprints than this would not fit in a square; no lab field needs more (tests/cross.test.ts). */
const MAX_PRINTS = 8;

/** A row of footprints (two rows from five up), one per hop. */
function Prints({ count }: { count: number }) {
  const n = Math.min(count, MAX_PRINTS);
  const perRow = n <= 4 ? n : Math.ceil(n / 2);
  return (
    <div className="home-prints" style={{ '--per-row': perRow, '--print-w': n <= 4 ? '11%' : '9%' } as CSSProperties} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => <span key={i} className="print" />)}
    </div>
  );
}

export function CrossScreen({ grid, spots, steps = false, eagerHint, top, onNext, onHome }: {
  grid: readonly string[];
  /** The home spots show whether the picked friend can ever land there. */
  spots: boolean;
  /** A spot the picked friend can reach also shows one footprint per hop it needs alone. */
  steps?: boolean;
  eagerHint?: boolean;
  top?: ReactNode;
  onNext?: () => void;
  onHome: () => void;
}) {
  const later = useTimers();
  const puzzle = useMemo(() => mustParseCross(grid), [grid]);
  const [game, setGame] = useState<GameState>(() => crossStart(puzzle));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [mood, setMood] = useState<FriendMood>('idle');
  const [motion, setMotion] = useState<'normal' | 'rewind'>('normal');
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [idleKey, setIdleKey] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const [shake, setShake] = useState<{ pos: number; key: number } | null>(null);

  const hops = useMemo(
    () => (busy || won || !game.friends[selected] ? [] : crossHops(puzzle, game, selected)),
    [busy, won, puzzle, game, selected],
  );
  const picked = game.friends[selected];
  const reachable = useMemo(
    () => (spots && picked && !won ? reachSteps(puzzle, picked.kind, picked.at) : null),
    [spots, picked, won, puzzle],
  );

  useEffect(() => {
    if (won || busy) return;
    const t = window.setTimeout(() => {
      const res = solveCross(puzzle, game);
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
    const res = crossHop(puzzle, game, { friend: fi, to });
    setSelected(fi);
    setBusy(true);
    setNudgeKey(0);
    setPokeKey(0);
    setGame(res.state);
    sfx.hop(from.kind);
    if (res.promoted) later(() => sfx.promote(), travel);
    if (puzzle.homes.includes(to)) later(() => sfx.munch(res.state.friends.filter((f) => puzzle.homes.includes(f.at)).length - 1), travel);
    later(() => {
      if (crossWon(puzzle, res.state)) {
        setWon(true);
        setMood('dance');
        sfx.win();
        later(() => setShowGo(true), 1100);
        return;
      }
      if (solveCross(puzzle, res.state).status === 'stuck') {
        setMood('confused');
        sfx.uhoh();
        later(() => rewind(), 1000);
        return;
      }
      // Pick the next friend still away from home, so the kid sees the team.
      const away = res.state.friends.findIndex((f) => !puzzle.homes.includes(f.at));
      if (puzzle.homes.includes(to) && away >= 0) setSelected(away);
      setBusy(false);
    }, travel + 350);
  };

  const rewind = () => {
    setMood('idle');
    setMotion('rewind');
    setGame(crossStart(puzzle));
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

  const again = () => {
    wakeAudio();
    if (busy && !won) return;
    setWon(false);
    setShowGo(false);
    rewind();
  };

  const press = (pos: number) => {
    wakeAudio();
    if (won || busy) return;
    setHint(null);
    setIdleKey((n) => n + 1);
    const fi = game.friends.findIndex((f) => f.at === pos);
    if (fi >= 0) {
      setSelected(fi);
      setPokeKey((n) => n + 1);
      sfx.select(game.friends[fi].kind);
      return;
    }
    if (hops.includes(pos)) {
      move(selected, pos);
      return;
    }
    setNudgeKey((n) => n + 1);
    sfx.nudge();
    if (reachable && puzzle.homes.includes(pos) && !reachable.has(pos)) setShake((s) => ({ pos, key: (s?.key ?? 0) + 1 }));
  };

  const cell = (pos: number): CSSProperties => ({
    left: `${((pos % puzzle.cols) * 100) / puzzle.cols}%`,
    top: `${(Math.floor(pos / puzzle.cols) * 100) / puzzle.rows}%`,
    width: `${100 / puzzle.cols}%`,
    height: `${100 / puzzle.rows}%`,
  });

  const extra = (
    <>
      {puzzle.homes.map((h) => {
        const filled = game.friends.some((f) => f.at === h);
        const say = filled || !reachable || busy || !picked ? '' : reachable.has(h) ? 'yes' : 'no';
        const shaking = shake?.pos === h && say === 'no';
        return (
          <div
            key={`h${h}${shaking ? `s${shake.key}` : ''}`}
            className={`home-spot ${filled ? 'filled' : ''} ${say} ${shaking ? 'shake' : ''}`}
            style={cell(h)}
          >
            {say === 'yes' && <FriendArt key={`${selected}${picked.kind}`} kind={picked.kind} mood="sleepy" className="home-ghost" />}
            {say === 'yes' && steps && <Prints count={reachable!.get(h) ?? 0} />}
          </div>
        );
      })}
    </>
  );

  return (
    <div className="screen play" style={{ background: CROSS_SKY }}>
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
          state={game}
          treat="berry"
          selected={selected}
          hops={hops}
          hint={hint}
          mood={mood}
          gulp={null}
          motion={motion}
          round={round}
          nudgeKey={nudgeKey}
          pokeKey={pokeKey}
          extra={extra}
          onPress={press}
          onRelease={() => {}}
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

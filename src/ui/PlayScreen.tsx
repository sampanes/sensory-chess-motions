import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { TreatKind } from '../content/worlds.ts';
import { startState } from '../core/puzzle.ts';
import { applyMove, friendIndexAt, hopsFor, isWon } from '../core/rules.ts';
import { solve } from '../core/solver.ts';
import type { Puzzle } from '../core/types.ts';
import { AgainIcon, GoIcon, HomeIcon } from './art.tsx';
import { Board, type FriendMood } from './Board.tsx';
import { Confetti } from './Confetti.tsx';
import { moveDuration, REWIND_MS } from './motion.ts';
import { sfx, wakeAudio } from './sound.ts';

export interface PlayScreenProps {
  puzzle: Puzzle;
  treat: TreatKind;
  sky: string;
  /** Show the hint hand sooner (first level of a world). */
  eagerHint?: boolean;
  /** Little row of dots showing where you are in the world. */
  dots?: ReactNode;
  onWin?: () => void;
  /** Where the big "go" button leads after a win. Omit to only offer replay. */
  onNext?: () => void;
  onHome: () => void;
}

const HINT_MS = 7000;
const EAGER_HINT_MS = 2500;
const FOLLOW_UP_HINT_MS = 1200;

/** setTimeout that is cancelled automatically when the screen goes away. */
function useTimers() {
  const ids = useRef<number[]>([]);
  useEffect(() => () => ids.current.forEach((id) => window.clearTimeout(id)), []);
  return useCallback((fn: () => void, ms: number) => {
    ids.current.push(window.setTimeout(fn, ms));
  }, []);
}

export function PlayScreen({ puzzle, treat, sky, eagerHint, dots, onWin, onNext, onHome }: PlayScreenProps) {
  const later = useTimers();
  const [game, setGame] = useState(() => startState(puzzle));
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [showGo, setShowGo] = useState(false);
  const [mood, setMood] = useState<FriendMood>('idle');
  const [motion, setMotion] = useState<'normal' | 'rewind'>('normal');
  const [round, setRound] = useState(0);
  const [gulp, setGulp] = useState<{ index: number; delay: number } | null>(null);
  const [hint, setHint] = useState<number | null>(null);
  const [hintSoon, setHintSoon] = useState(false);
  const [idleKey, setIdleKey] = useState(0);
  const [nudgeKey, setNudgeKey] = useState(0);
  const [pokeKey, setPokeKey] = useState(0);
  const dragFrom = useRef<number | null>(null);

  const hops = useMemo(
    () => (busy || won || !game.friends[selected] ? [] : hopsFor(puzzle, game, selected)),
    [busy, won, puzzle, game, selected],
  );

  // Idle hint: after a quiet spell, a hand taps the next square of a shortest
  // solution (or the friend to pick, when another friend should move).
  useEffect(() => {
    if (won || busy) return;
    const wait = hintSoon ? FOLLOW_UP_HINT_MS : eagerHint ? EAGER_HINT_MS : HINT_MS;
    const t = window.setTimeout(() => {
      const res = solve(puzzle, game);
      if (res.status !== 'solved' || res.moves.length === 0) return;
      const m = res.moves[0];
      setHint(m.friend === selected ? m.to : game.friends[m.friend].at);
    }, wait);
    return () => window.clearTimeout(t);
  }, [won, busy, hintSoon, eagerHint, puzzle, game, selected, idleKey]);

  const eatenSoFar = puzzle.treats.length - popCount(game.left);

  const move = (fi: number, to: number) => {
    const from = game.friends[fi];
    const res = applyMove(puzzle, game, { friend: fi, to });
    if (!res) return;
    const dist = Math.max(
      Math.abs((from.at % puzzle.cols) - (to % puzzle.cols)),
      Math.abs(Math.floor(from.at / puzzle.cols) - Math.floor(to / puzzle.cols)),
    );
    const travel = moveDuration(from.kind, dist);
    const arrive = Math.round(travel * 0.85);

    setGame(res.state);
    setSelected(fi);
    setBusy(true);
    setMotion('normal');
    setNudgeKey(0);
    setPokeKey(0);
    sfx.hop(from.kind);

    if (res.ate >= 0) {
      setGulp({ index: res.ate, delay: arrive });
      later(() => sfx.munch(eatenSoFar), arrive);
    }
    if (res.promoted) later(() => sfx.promote(), travel);

    later(() => {
      if (isWon(res.state)) {
        setWon(true);
        setMood('dance');
        sfx.win();
        onWin?.();
        later(() => setShowGo(true), 1100);
        return;
      }
      if (solve(puzzle, res.state).status === 'stuck') {
        // No way to finish from here (a pawn walked past its treats).
        // Never a "you lose": a puzzled wiggle, then everything floats home.
        setMood('confused');
        sfx.uhoh();
        later(() => rewind(), 1000);
        return;
      }
      setBusy(false);
    }, travel + (res.ate >= 0 ? 120 : 0));
  };

  const rewind = () => {
    setMood('idle');
    setMotion('rewind');
    setGame(startState(puzzle));
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

  const press = (pos: number) => {
    wakeAudio();
    if (won || busy) return;
    setHintSoon(hint !== null);
    setHint(null);
    setIdleKey((n) => n + 1);

    const fi = friendIndexAt(game, pos);
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

  // Dragging a friend onto a glowing spot works too.
  const release = (pos: number) => {
    const fi = dragFrom.current;
    dragFrom.current = null;
    if (fi === null || won || busy || pos === game.friends[fi].at) return;
    if (hopsFor(puzzle, game, fi).includes(pos)) move(fi, pos);
  };

  return (
    <div className="screen play" style={{ background: sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="dots-row">{dots}</div>
        <button className="round-btn" onClick={again} aria-label="Start over">
          <AgainIcon className="icon" />
        </button>
      </div>

      <div className="board-wrap">
        <Board
          puzzle={puzzle}
          state={game}
          treat={treat}
          selected={selected}
          hops={hops}
          hint={hint}
          mood={mood}
          gulp={gulp}
          motion={motion}
          round={round}
          nudgeKey={nudgeKey}
          pokeKey={pokeKey}
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

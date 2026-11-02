// How hard a puzzle is for a little one, from the whole map of positions it
// can reach. Pure and fast: built-in puzzles reach at most a few thousand
// positions, so every one of them is visited.
//
//   moves      fewest hops to finish.
//   guessBits  luck needed to tap straight through: if a kid picked a hop at
//              random every time, the chance of staying on SOME shortest
//              route is 2^-guessBits. Every tempting wrong hop, including a
//              hop into a dead end, makes it bigger. One sure hop adds 0, a
//              fifty-fifty adds 1, one good hop out of eight adds 3.
//   deadEnds   share of reachable positions that can never be finished
//              (each one is a gentle rewind waiting to happen).
//   score      moves + guessBits. A first cut, to be tuned by watching kids.

import { startState } from './puzzle.ts';
import { applyHop, hopsFor, isWon } from './rules.ts';
import { DEFAULT_STATE_LIMIT, stateKey } from './solver.ts';
import type { GameState, Puzzle } from './types.ts';

export interface Difficulty {
  moves: number;
  guessBits: number;
  deadEnds: number;
  /** Positions reachable from the start, finished ones included. */
  positions: number;
  score: number;
}

/** Null when the puzzle cannot be finished or is too big to map. */
export function rateDifficulty(p: Puzzle, stateLimit = DEFAULT_STATE_LIMIT): Difficulty | null {
  // 1. Map every reachable position and the hops between them.
  const start = startState(p);
  const index = new Map<number, number>([[stateKey(start), 0]]);
  const states: GameState[] = [start];
  const hops: number[][] = [];
  for (let i = 0; i < states.length; i++) {
    const s = states[i];
    const out: number[] = [];
    if (!isWon(s)) {
      for (let fi = 0; fi < s.friends.length; fi++) {
        for (const to of hopsFor(p, s, fi)) {
          const next = applyHop(p, s, { friend: fi, to }).state;
          const key = stateKey(next);
          let j = index.get(key);
          if (j === undefined) {
            j = states.length;
            if (j >= stateLimit) return null;
            index.set(key, j);
            states.push(next);
          }
          out.push(j);
        }
      }
    }
    hops.push(out);
  }

  // 2. Hops left to finish from each position, walking back from the wins.
  const into: number[][] = states.map(() => []);
  hops.forEach((out, i) => out.forEach((j) => into[j].push(i)));
  const togo: number[] = states.map((s) => (isWon(s) ? 0 : Infinity));
  const byDistance: number[][] = [states.flatMap((s, i) => (isWon(s) ? [i] : []))];
  for (let d = 1; byDistance[d - 1].length > 0; d++) {
    const ring: number[] = [];
    for (const j of byDistance[d - 1]) {
      for (const i of into[j]) {
        if (togo[i] === Infinity) {
          togo[i] = d;
          ring.push(i);
        }
      }
    }
    byDistance.push(ring);
  }
  if (togo[0] === Infinity) return null;

  // 3. Chance a random tapper stays on a shortest route, nearest-to-done first.
  const chance: number[] = states.map((s) => (isWon(s) ? 1 : 0));
  for (const ring of byDistance.slice(1)) {
    for (const i of ring) {
      let good = 0;
      for (const j of hops[i]) if (togo[j] === togo[i] - 1) good += chance[j];
      chance[i] = good / hops[i].length;
    }
  }

  const moves = togo[0];
  const guessBits = round2(-Math.log2(chance[0]));
  const deadEnds = round2(togo.filter((d) => d === Infinity).length / states.length);
  return { moves, guessBits, deadEnds, positions: states.length, score: round2(moves + guessBits) };
}

function round2(x: number): number {
  return Math.round(x * 100) / 100 + 0; // + 0 turns -0 into 0
}

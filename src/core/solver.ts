// Breadth-first search over game states. Used to:
//   - prove every built-in puzzle can be finished (tests),
//   - give the idle "tap here" hint (first move of a shortest solution),
//   - notice when a puzzle can no longer be finished, so the game can rewind.

import { applyHop, hopsFor, isWon } from './rules.ts';
import type { GameState, Kind, Move, Puzzle } from './types.ts';
import { KINDS } from './types.ts';

export type SolveResult =
  | { status: 'solved'; moves: Move[] }
  | { status: 'stuck' }
  | { status: 'too-big' };

export const DEFAULT_STATE_LIMIT = 250_000;

/**
 * How many states a search may visit on this board. Up to 6x6 it is
 * DEFAULT_STATE_LIMIT. A bigger board gives every state more hops to try
 * (a sliding friend crosses 8 squares, not 6), so the cap shrinks with the
 * cube of the area: a search on a hand-made 8x8 board in a shared link or the
 * maker then costs about what the worst 6x6 one did, instead of freezing the
 * page for seconds. It still covers every built-in 8x8 puzzle with room to
 * spare (tests/levels.test.ts solves each one with this cap).
 */
export function stateLimitFor(p: Puzzle): number {
  const area = p.rows * p.cols;
  return area <= 36 ? DEFAULT_STATE_LIMIT : Math.round(DEFAULT_STATE_LIMIT * (36 / area) ** 3);
}

const KIND_CODE = new Map<Kind, number>(KINDS.map((k, i) => [k, i]));

// Plain arithmetic (not bitwise) so keys can exceed 32 bits:
// 10 treat bits + 3 friends * 9 bits = 37 bits, well under 2^53.
export function stateKey(s: GameState): number {
  let key = s.left;
  for (const f of s.friends) key = key * 512 + KIND_CODE.get(f.kind)! * 64 + f.at;
  return key;
}

/** `won` is the finish test: every treat eaten, unless a mode says otherwise (the team crossing). */
export function solve(
  p: Puzzle,
  start: GameState,
  stateLimit = stateLimitFor(p),
  won: (s: GameState) => boolean = isWon,
): SolveResult {
  if (won(start)) return { status: 'solved', moves: [] };

  const startKey = stateKey(start);
  const parent = new Map<number, { prev: number; move: Move }>();
  const seen = new Set<number>([startKey]);
  let frontier: { key: number; state: GameState }[] = [{ key: startKey, state: start }];

  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { key, state } of frontier) {
      for (let fi = 0; fi < state.friends.length; fi++) {
        for (const to of hopsFor(p, state, fi)) {
          const move = { friend: fi, to };
          const res = applyHop(p, state, move);
          const k = stateKey(res.state);
          if (seen.has(k)) continue;
          seen.add(k);
          parent.set(k, { prev: key, move });
          if (won(res.state)) return { status: 'solved', moves: walkBack(parent, startKey, k) };
          if (seen.size > stateLimit) return { status: 'too-big' };
          next.push({ key: k, state: res.state });
        }
      }
    }
    frontier = next;
  }
  return { status: 'stuck' };
}

function walkBack(parent: Map<number, { prev: number; move: Move }>, startKey: number, endKey: number): Move[] {
  const moves: Move[] = [];
  let k = endKey;
  while (k !== startKey) {
    const step = parent.get(k)!;
    moves.push(step.move);
    k = step.prev;
  }
  return moves.reverse();
}

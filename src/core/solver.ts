// Breadth-first search over game states. Used to:
//   - prove every built-in puzzle can be finished (tests),
//   - give the idle "tap here" hint (first move of a shortest solution),
//   - notice when a puzzle can no longer be finished, so the game can rewind.

import { applyMove, hopsFor, isWon } from './rules.ts';
import type { GameState, Kind, Move, Puzzle } from './types.ts';
import { KINDS } from './types.ts';

export type SolveResult =
  | { status: 'solved'; moves: Move[] }
  | { status: 'stuck' }
  | { status: 'too-big' };

export const DEFAULT_STATE_LIMIT = 250_000;

const KIND_CODE = new Map<Kind, number>(KINDS.map((k, i) => [k, i]));

// Plain arithmetic (not bitwise) so keys can exceed 32 bits:
// 10 treat bits + 3 friends * 9 bits = 37 bits, well under 2^53.
function keyOf(s: GameState): number {
  let key = s.left;
  for (const f of s.friends) key = key * 512 + KIND_CODE.get(f.kind)! * 64 + f.at;
  return key;
}

export function solve(p: Puzzle, start: GameState, stateLimit = DEFAULT_STATE_LIMIT): SolveResult {
  if (isWon(start)) return { status: 'solved', moves: [] };

  const startKey = keyOf(start);
  const parent = new Map<number, { prev: number; move: Move }>();
  const seen = new Set<number>([startKey]);
  let frontier: { key: number; state: GameState }[] = [{ key: startKey, state: start }];

  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { key, state } of frontier) {
      for (let fi = 0; fi < state.friends.length; fi++) {
        for (const to of hopsFor(p, state, fi)) {
          const move = { friend: fi, to };
          const res = applyMove(p, state, move)!;
          const k = keyOf(res.state);
          if (seen.has(k)) continue;
          seen.add(k);
          parent.set(k, { prev: key, move });
          if (isWon(res.state)) return { status: 'solved', moves: walkBack(parent, startKey, k) };
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

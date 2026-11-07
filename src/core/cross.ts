// Cross with a team (lab prototype, plan in docs/TEAM_CROSSING.md): every
// friend has to reach a gold home square across the field. The field is built
// so each stretch suits a different friend: the rook's long lanes, the
// bishop's diagonals (only ever on its own color), the knight's jumps over
// rock hedges nobody else can pass. Friends block each other, so the order of
// hops matters too. Moves are the usual ones from rules.ts.
//
// Grid text: the usual '.', '#' and capital friends, plus 'o' for an empty
// home square. A friend that starts on a home square is written as itself;
// list those squares in `extraHomes` (rare).

import { KIND_BY_CHAR, LIMITS } from './puzzle.ts';
import { applyHop, hopsFor } from './rules.ts';
import { solve, type SolveResult } from './solver.ts';
import type { Friend, GameState, Kind, Puzzle } from './types.ts';

export interface CrossPuzzle extends Puzzle {
  /** Home squares, one per friend. */
  homes: readonly number[];
}

export type CrossParse = { ok: true; puzzle: CrossPuzzle } | { ok: false; error: string };

export function parseCross(grid: readonly string[]): CrossParse {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < LIMITS.minSize || rows > LIMITS.maxSize || cols < LIMITS.minSize || cols > LIMITS.maxSize) {
    return { ok: false, error: `Board must be ${LIMITS.minSize}-${LIMITS.maxSize} squares each way.` };
  }
  const rocks: boolean[] = [];
  const friends: Friend[] = [];
  const homes: number[] = [];
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) return { ok: false, error: `Row ${r + 1} has the wrong length.` };
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const pos = r * cols + c;
      rocks.push(ch === '#');
      if (ch === '.' || ch === '#') continue;
      if (ch === 'o') {
        homes.push(pos);
        continue;
      }
      const kind = KIND_BY_CHAR[ch];
      if (!kind) return { ok: false, error: `Unknown square "${ch}".` };
      if (kind === 'pawn' && r === 0) return { ok: false, error: 'A pawn cannot start on the top row.' };
      friends.push({ kind, at: pos });
    }
  }
  if (friends.length === 0 || friends.length > LIMITS.maxFriends) {
    return { ok: false, error: `Needs one to ${LIMITS.maxFriends} friends.` };
  }
  if (homes.length !== friends.length) return { ok: false, error: 'Needs one home square per friend.' };
  return { ok: true, puzzle: { rows, cols, rocks, treats: [], friends, homes } };
}

export function mustParseCross(grid: readonly string[]): CrossPuzzle {
  const res = parseCross(grid);
  if (!res.ok) throw new Error(`Bad crossing: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

export function crossStart(p: CrossPuzzle): GameState {
  return { friends: p.friends.map((f) => ({ ...f })), left: 0 };
}

export function crossWon(p: CrossPuzzle, s: GameState): boolean {
  return s.friends.every((f) => p.homes.includes(f.at));
}

/** Fewest hops that bring the whole team home. */
export function solveCross(p: CrossPuzzle, start: GameState, limit?: number): SolveResult {
  return solve(p, start, limit, (s) => crossWon(p, s));
}

export { applyHop as crossHop, hopsFor as crossHops };

/**
 * Every square a friend of this kind could ever reach from `from`, hopping
 * alone across the field (rocks only, no teammates). This is what the reach
 * map shows: the bishop's other color is never in it, and the knight's
 * includes the far side of a rock hedge.
 */
export function reachMap(p: Puzzle, kind: Kind, from: number): Set<number> {
  const seen = new Set([from]);
  let frontier = [{ kind, at: from }];
  while (frontier.length) {
    const next: Friend[] = [];
    for (const f of frontier) {
      const s: GameState = { friends: [f], left: 0 };
      for (const to of hopsFor({ ...p, treats: [] }, s, 0)) {
        const after = applyHop({ ...p, treats: [] }, s, { friend: 0, to }).state.friends[0];
        if (seen.has(to)) continue;
        seen.add(to);
        next.push(after);
      }
    }
    frontier = next;
  }
  return seen;
}

// "Make it a bit harder" for the puzzle maker: one small change (a rock or a
// treat on an empty square) that raises the difficulty score while the puzzle
// can still be finished. Pure, so it is tested like the rest of the core.
//
// The step is the SMALLEST rise that is still noticeable, so pressing the
// button again and again climbs gently instead of jumping to a monster.

import { rateDifficulty, type Difficulty } from './difficulty.ts';
import { MAX_MOVES } from './generate.ts';
import { LIMITS, parseGrid, startState } from './puzzle.ts';
import { solve } from './solver.ts';

/** A rise smaller than this is not worth showing a grown-up. */
const MIN_RISE = 0.5;
/** A puzzle (or a candidate) that reaches more positions than this is too big to rate quickly. */
const MAX_POSITIONS = 8_000;

export interface Harder {
  grid: string[];
  /** The square that changed (0-based) and what was put there. */
  row: number;
  col: number;
  added: '#' | '*';
  before: Difficulty;
  after: Difficulty;
}

function rate(grid: readonly string[]): Difficulty | null {
  const res = parseGrid(grid);
  return res.ok ? rateDifficulty(res.puzzle, MAX_POSITIONS) : null;
}

/**
 * Null when the puzzle cannot be finished as it is, or nothing small makes it
 * harder. 'too-big' when the puzzle has too many positions to rate, or the
 * time ran out before anything was found: that is not the same as "nothing
 * makes it harder", and the maker says so.
 *
 * `budgetMs` bounds the search (the maker passes a fraction of a second so
 * the page never freezes); when it runs out, the best change found so far is
 * returned. Without a budget the answer is exact, and the same every time.
 */
export function makeHarder(grid: readonly string[], budgetMs = Infinity, now: () => number = Date.now): Harder | 'too-big' | null {
  const parsed = parseGrid(grid);
  if (!parsed.ok) return null;
  const started = now();
  const before = rateDifficulty(parsed.puzzle, MAX_POSITIONS);
  if (!before) {
    // Cannot be finished, or just too big to map? Looking for one way to finish is far
    // cheaper than mapping every position, so ask the solver.
    return solve(parsed.puzzle, startState(parsed.puzzle), MAX_POSITIONS * 4).status === 'stuck' ? null : 'too-big';
  }
  let outOfTime = false;
  const treats = grid.join('').split('*').length - 1;
  let best: Harder | null = null;
  search: for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] !== '.') continue;
      if (now() - started > budgetMs) {
        outOfTime = true;
        break search;
      }
      for (const added of ['#', '*'] as const) {
        if (added === '*' && treats >= LIMITS.maxTreats) continue;
        const next = grid.map((line, r) => (r === row ? line.slice(0, col) + added + line.slice(col + 1) : line));
        const after = rate(next);
        if (!after || after.moves > MAX_MOVES || after.score < before.score + MIN_RISE) continue;
        // Smallest rise first; between equals, the one with fewer dead ends (fewer rewinds).
        if (!best || after.score < best.after.score || (after.score === best.after.score && after.deadEnds < best.after.deadEnds)) {
          best = { grid: next, row, col, added, before, after };
        }
      }
    }
  }
  return best ?? (outOfTime ? 'too-big' : null);
}

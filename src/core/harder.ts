// "Make it a bit harder" for the puzzle maker: one small change (a rock or a
// treat on an empty square) that raises the difficulty score while the puzzle
// can still be finished. Pure, so it is tested like the rest of the core.
//
// The step is the SMALLEST rise that is still noticeable, so pressing the
// button again and again climbs gently instead of jumping to a monster.

import { rateDifficulty, type Difficulty } from './difficulty.ts';
import { MAX_MOVES } from './generate.ts';
import { LIMITS, parseGrid } from './puzzle.ts';

/** A rise smaller than this is not worth showing a grown-up. */
const MIN_RISE = 0.5;
/** Candidates that reach more positions than this are skipped (keeps the button instant). */
const MAX_POSITIONS = 20_000;

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

/** Null when the puzzle cannot be finished as it is, or nothing small makes it harder. */
export function makeHarder(grid: readonly string[]): Harder | null {
  const before = rate(grid);
  if (!before) return null;
  const treats = grid.join('').split('*').length - 1;
  let best: Harder | null = null;
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] !== '.') continue;
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
  return best;
}

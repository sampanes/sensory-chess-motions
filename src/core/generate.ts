// Random puzzles, kept only when they pass the same bar as hand-made ones.
// Pure and seeded: the same seed always gives the same puzzles, so a puzzle
// picked from a run can be found again, and a daily puzzle can come from a date.
//
// A candidate is kept when:
//   - it can be finished in at most MAX_MOVES hops,
//   - every rock matters (take it away and the puzzle gets easier or harder),
//   - in a puzzle with several friends, every friend is needed (without it
//     the puzzle cannot be finished, or takes more hops),
//   - at most a quarter of its positions are dead ends,
//   - it is not a long walk: hops that eat nothing are at most one per treat,
//     and at least a sixth of the board holds a friend, a treat or a rock.
//     (The difficulty score counts every hop on an empty board as a chance to
//     go wrong, so without this the hardest-looking puzzles would be the
//     emptiest and dullest.)

import { rateDifficulty, type Difficulty } from './difficulty.ts';
import { CHAR_BY_KIND, parseGrid } from './puzzle.ts';
import type { Kind } from './types.ts';

export const MAX_MOVES = 10;
const MAX_DEAD_ENDS = 0.25;
/** Bigger than any hand-made level (about 7k positions), small enough to give up fast. */
const MAX_POSITIONS = 20000;

/** Small fast seeded random numbers in [0, 1) (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Shape {
  kinds: readonly Kind[];
  rows: number;
  cols: number;
  treats: number;
  rocks: number;
}

/** A random grid of the given shape, or null when the pieces do not fit. */
export function randomGrid(shape: Shape, rand: () => number): string[] | null {
  const { rows, cols } = shape;
  const cells: string[] = new Array(rows * cols).fill('.');
  const free = () => cells.flatMap((ch, pos) => (ch === '.' ? [pos] : []));
  const pick = (from: number[]) => (from.length ? from[Math.floor(rand() * from.length)] : -1);
  for (const kind of shape.kinds) {
    // A pawn cannot start on the top row, and one on the second row could only promote.
    const spots = free().filter((pos) => kind !== 'pawn' || pos >= 2 * cols);
    const at = pick(spots);
    if (at < 0) return null;
    cells[at] = CHAR_BY_KIND[kind];
  }
  for (let i = 0; i < shape.treats; i++) {
    const at = pick(free());
    if (at < 0) return null;
    cells[at] = '*';
  }
  for (let i = 0; i < shape.rocks; i++) {
    const at = pick(free());
    if (at < 0) return null;
    cells[at] = '#';
  }
  return Array.from({ length: rows }, (_, r) => cells.slice(r * cols, (r + 1) * cols).join(''));
}

const rate = (grid: readonly string[]): Difficulty | null => {
  const res = parseGrid(grid);
  return res.ok ? rateDifficulty(res.puzzle, MAX_POSITIONS) : null;
};

const withSquare = (grid: readonly string[], r: number, c: number, ch: string) =>
  grid.map((line, i) => (i === r ? line.slice(0, c) + ch + line.slice(c + 1) : line));

/** The difficulty of a grid if it passes the bar above, else null. */
export function judge(grid: readonly string[]): Difficulty | null {
  const d = rate(grid);
  if (!d || d.moves > MAX_MOVES || d.deadEnds > MAX_DEAD_ENDS) return null;
  const squares = grid.join('');
  const treats = squares.split('*').length - 1;
  if (d.moves - treats > treats) return null;
  if (squares.replace(/\./g, '').length * 6 < squares.length) return null;
  let friends = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const ch = grid[r][c];
      if (ch === '#') {
        const without = rate(withSquare(grid, r, c, '.'));
        if (without && without.moves === d.moves && Math.abs(without.score - d.score) < 0.5) return null;
      } else if (/[KQRBNP]/.test(ch)) {
        friends++;
      }
    }
  }
  if (friends > 1) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (!/[KQRBNP]/.test(grid[r][c])) continue;
        const without = rate(withSquare(grid, r, c, '.'));
        if (without && without.moves <= d.moves) return null;
      }
    }
  }
  return d;
}

/**
 * The same puzzle seen in a mirror or turned around maps to one key, so
 * near-copies of a puzzle are easy to spot. Pawns walk up the board, so a
 * puzzle with a pawn may only be mirrored left to right.
 */
export function shapeKey(grid: readonly string[]): string {
  const rows = grid.length;
  const cols = grid[0].length;
  const at = (r: number, c: number) => grid[r][c];
  const turned: { rows: number; cols: number; get: (r: number, c: number) => string }[] = [
    { rows, cols, get: at },
    { rows, cols, get: (r, c) => at(r, cols - 1 - c) },
  ];
  if (!grid.some((line) => line.includes('P'))) {
    turned.push(
      { rows, cols, get: (r, c) => at(rows - 1 - r, c) },
      { rows, cols, get: (r, c) => at(rows - 1 - r, cols - 1 - c) },
      { rows: cols, cols: rows, get: (r, c) => at(c, r) },
      { rows: cols, cols: rows, get: (r, c) => at(rows - 1 - c, r) },
      { rows: cols, cols: rows, get: (r, c) => at(c, cols - 1 - r) },
      { rows: cols, cols: rows, get: (r, c) => at(rows - 1 - c, cols - 1 - r) },
    );
  }
  return turned
    .map((v) => Array.from({ length: v.rows }, (_, r) => Array.from({ length: v.cols }, (_, c) => v.get(r, c)).join('')).join('/'))
    .sort()[0];
}

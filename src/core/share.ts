// Puzzle <-> URL-safe string, for share links like ?p=--t--.-xKx-.-----
// Rows are separated by '.', and grid characters are swapped for ones that
// never need escaping in a URL.
//
// A link can also carry a SET of puzzles to play in order (for a class, or a
// rainy day): the codes are joined with '_', as in ?p=<code>_<code>_<code>.

import { parseGrid, type ParseResult } from './puzzle.ts';
import type { Puzzle } from './types.ts';

const TO_URL: Readonly<Record<string, string>> = { '.': '-', '#': 'x', '*': 't' };
const FROM_URL: Readonly<Record<string, string>> = { '-': '.', x: '#', t: '*' };

/** The most puzzles one link may carry. */
export const SET_MAX = 12;
const SET_JOIN = '_';

export function encodePuzzle(grid: readonly string[]): string {
  return grid.map((row) => [...row].map((ch) => TO_URL[ch] ?? ch).join('')).join('.');
}

export function decodePuzzle(code: string): ParseResult {
  if (!/^[-xtKQRBNP.]{1,60}$/.test(code)) {
    return { ok: false, error: 'That puzzle link is broken.' };
  }
  const grid = code.split('.').map((row) => [...row].map((ch) => FROM_URL[ch] ?? ch).join(''));
  return parseGrid(grid);
}

/** Puzzle codes joined into one link code. */
export function joinSet(codes: readonly string[]): string {
  return codes.join(SET_JOIN);
}

export function encodeSet(grids: readonly (readonly string[])[]): string {
  return joinSet(grids.map(encodePuzzle));
}

export type SetResult = { ok: true; puzzles: Puzzle[] } | { ok: false; error: string };

/** One puzzle, or several joined with '_'. Every one must be a good puzzle, or the whole link is refused. */
export function decodeSet(code: string): SetResult {
  const codes = code.split(SET_JOIN);
  if (codes.length > SET_MAX) return { ok: false, error: `That link has more than ${SET_MAX} puzzles.` };
  const puzzles: Puzzle[] = [];
  for (const [i, one] of codes.entries()) {
    const res = decodePuzzle(one);
    if (!res.ok) return { ok: false, error: codes.length > 1 ? `Puzzle ${i + 1} in that link is broken.` : res.error };
    puzzles.push(res.puzzle);
  }
  return { ok: true, puzzles };
}

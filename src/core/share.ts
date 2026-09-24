// Puzzle <-> URL-safe string, for share links like ?p=--t--.-xKx-.-----
// Rows are separated by '.', and grid characters are swapped for ones that
// never need escaping in a URL.

import { parseGrid, type ParseResult } from './puzzle.ts';

const TO_URL: Readonly<Record<string, string>> = { '.': '-', '#': 'x', '*': 't' };
const FROM_URL: Readonly<Record<string, string>> = { '-': '.', x: '#', t: '*' };

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

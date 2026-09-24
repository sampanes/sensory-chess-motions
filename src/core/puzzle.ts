// Text format for puzzles, one string per row:
//
//   .  grass          #  rock          *  treat
//   K  king   Q  queen   R  rook   B  bishop   N  knight   P  pawn
//
// Example:
//   '..*..',
//   '.###.',
//   '..K..',

import type { Friend, GameState, Kind, Puzzle } from './types.ts';

export const LIMITS = {
  minSize: 3,
  maxSize: 6,
  maxFriends: 3,
  maxTreats: 10,
} as const;

export const KIND_BY_CHAR: Readonly<Record<string, Kind>> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
  P: 'pawn',
};

export const CHAR_BY_KIND: Readonly<Record<Kind, string>> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: 'P',
};

export type ParseResult = { ok: true; puzzle: Puzzle } | { ok: false; error: string };

export function parseGrid(grid: readonly string[]): ParseResult {
  const rows = grid.length;
  if (rows < LIMITS.minSize || rows > LIMITS.maxSize) {
    return { ok: false, error: `Board needs ${LIMITS.minSize}-${LIMITS.maxSize} rows (has ${rows}).` };
  }
  const cols = grid[0].length;
  if (cols < LIMITS.minSize || cols > LIMITS.maxSize) {
    return { ok: false, error: `Board needs ${LIMITS.minSize}-${LIMITS.maxSize} columns (has ${cols}).` };
  }

  const rocks: boolean[] = [];
  const treats: number[] = [];
  const friends: Friend[] = [];

  for (let r = 0; r < rows; r++) {
    const line = grid[r];
    if (line.length !== cols) {
      return { ok: false, error: `Row ${r + 1} has ${line.length} squares; expected ${cols}.` };
    }
    for (let c = 0; c < cols; c++) {
      const ch = line[c];
      const pos = r * cols + c;
      rocks.push(ch === '#');
      if (ch === '.' || ch === '#') continue;
      if (ch === '*') {
        treats.push(pos);
        continue;
      }
      const kind = KIND_BY_CHAR[ch];
      if (!kind) return { ok: false, error: `Unknown square "${ch}" in row ${r + 1}.` };
      if (kind === 'pawn' && r === 0) {
        return { ok: false, error: 'A pawn cannot start on the top row.' };
      }
      friends.push({ kind, at: pos });
    }
  }

  if (friends.length === 0) return { ok: false, error: 'Add at least one friend.' };
  if (friends.length > LIMITS.maxFriends) {
    return { ok: false, error: `At most ${LIMITS.maxFriends} friends.` };
  }
  if (treats.length === 0) return { ok: false, error: 'Add at least one treat.' };
  if (treats.length > LIMITS.maxTreats) {
    return { ok: false, error: `At most ${LIMITS.maxTreats} treats.` };
  }

  return { ok: true, puzzle: { rows, cols, rocks, treats, friends } };
}

/** Parse a grid that is known to be valid (built-in content). Throws otherwise. */
export function mustParse(grid: readonly string[]): Puzzle {
  const res = parseGrid(grid);
  if (!res.ok) throw new Error(`Bad puzzle grid: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

export function toGrid(p: Puzzle): string[] {
  const out: string[] = [];
  for (let r = 0; r < p.rows; r++) {
    let line = '';
    for (let c = 0; c < p.cols; c++) {
      const pos = r * p.cols + c;
      const f = p.friends.find((x) => x.at === pos);
      if (f) line += CHAR_BY_KIND[f.kind];
      else if (p.rocks[pos]) line += '#';
      else if (p.treats.includes(pos)) line += '*';
      else line += '.';
    }
    out.push(line);
  }
  return out;
}

export function startState(p: Puzzle): GameState {
  return {
    friends: p.friends.map((f) => ({ ...f })),
    left: (1 << p.treats.length) - 1,
  };
}

export function rowOf(p: Puzzle, pos: number): number {
  return Math.floor(pos / p.cols);
}

export function colOf(p: Puzzle, pos: number): number {
  return pos % p.cols;
}

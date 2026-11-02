// Bedtime puzzles: tuck the grumpy king into bed (build a checkmate).
//
// A lone grumpy king stands on the board. The kid drops friends from a tray
// onto the board. The king is tucked in (checkmated) when a friend watches his
// square and every square he could step to is watched, walled off by a rock,
// or off the board. Real chess, with the defending side a lone king:
//
//   - A friend "watches" the squares it could move to, plus the square of a
//     teammate it protects. Lines are blocked by rocks and friends.
//   - The king is lifted off the board when working out what is watched: a
//     square behind him on a rook/bishop/queen line is still watched, because
//     he cannot step back along the line he is checked on.
//   - The king may take a friend standing next to him if no other friend
//     watches that square. In the game he shoos it back to the tray.
//   - Your own king can never stand next to the grumpy king.
//   - Every square covered but no check is a stalemate, not bedtime.
//
// Grid text: '.' grass, '#' rock, 'k' the grumpy king, and the usual capital
// letters (K Q R B N P) for friends that start on the board and never move.

import { KIND_BY_CHAR, LIMITS } from './puzzle.ts';
import type { Friend, Kind } from './types.ts';

export interface MatePuzzle {
  rows: number;
  cols: number;
  rocks: readonly boolean[];
  /** Square of the grumpy king. */
  king: number;
  /** Friends already on the board. They never move and are never shooed. */
  fixed: readonly Friend[];
  /** Friends waiting in the tray, in tray order. */
  tray: readonly Kind[];
}

/** A tray friend standing on the board. */
export interface Placement {
  tray: number;
  at: number;
}

export type MateStatus = 'mate' | 'check' | 'stalemate' | 'free';

type Dir = readonly [number, number];
const STRAIGHT: readonly Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: readonly Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: readonly Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: readonly Dir[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SLIDES: Partial<Record<Kind, readonly Dir[]>> = { rook: STRAIGHT, bishop: DIAGONAL, queen: ALL_DIRS };

export type MateParse = { ok: true; puzzle: MatePuzzle } | { ok: false; error: string };

export function parseMate(grid: readonly string[], tray: string): MateParse {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < LIMITS.minSize || rows > LIMITS.maxSize || cols < LIMITS.minSize || cols > LIMITS.maxSize) {
    return { ok: false, error: `Board must be ${LIMITS.minSize}-${LIMITS.maxSize} squares each way.` };
  }
  const rocks: boolean[] = [];
  const fixed: Friend[] = [];
  let king = -1;
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) return { ok: false, error: `Row ${r + 1} has the wrong length.` };
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const pos = r * cols + c;
      rocks.push(ch === '#');
      if (ch === '.' || ch === '#') continue;
      if (ch === 'k') {
        if (king >= 0) return { ok: false, error: 'Only one grumpy king.' };
        king = pos;
        continue;
      }
      const kind = KIND_BY_CHAR[ch];
      if (!kind) return { ok: false, error: `Unknown square "${ch}".` };
      fixed.push({ kind, at: pos });
    }
  }
  if (king < 0) return { ok: false, error: 'Needs a grumpy king (k).' };
  const trayKinds: Kind[] = [];
  for (const ch of tray) {
    const kind = KIND_BY_CHAR[ch];
    if (!kind) return { ok: false, error: `Unknown tray friend "${ch}".` };
    trayKinds.push(kind);
  }
  if (trayKinds.length === 0) return { ok: false, error: 'The tray needs at least one friend.' };
  return { ok: true, puzzle: { rows, cols, rocks, king, fixed, tray: trayKinds } };
}

export function mustParseMate(grid: readonly string[], tray: string): MatePuzzle {
  const res = parseMate(grid, tray);
  if (!res.ok) throw new Error(`Bad bedtime puzzle: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

/** Fixed friends plus the tray friends placed so far. */
export function friendsOf(p: MatePuzzle, placed: readonly Placement[]): Friend[] {
  return [...p.fixed, ...placed.map((pl) => ({ kind: p.tray[pl.tray], at: pl.at }))];
}

const near = (p: MatePuzzle, a: number, b: number) =>
  Math.max(Math.abs((a % p.cols) - (b % p.cols)), Math.abs(Math.floor(a / p.cols) - Math.floor(b / p.cols))) <= 1;

/** The (up to 8) on-board squares around the grumpy king. */
export function kingZone(p: MatePuzzle): number[] {
  const out: number[] = [];
  const r0 = Math.floor(p.king / p.cols);
  const c0 = p.king % p.cols;
  for (const [dr, dc] of ALL_DIRS) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (r >= 0 && r < p.rows && c >= 0 && c < p.cols) out.push(r * p.cols + c);
  }
  return out;
}

/** Squares watched by friend f. `friendAt` says which squares hold a friend. */
function watchedBy(p: MatePuzzle, f: Friend, friendAt: ReadonlySet<number>): number[] {
  const r0 = Math.floor(f.at / p.cols);
  const c0 = f.at % p.cols;
  const onBoard = (r: number, c: number) => r >= 0 && r < p.rows && c >= 0 && c < p.cols;
  const out: number[] = [];
  const slides = SLIDES[f.kind];
  if (slides) {
    for (const [dr, dc] of slides) {
      for (let r = r0 + dr, c = c0 + dc; onBoard(r, c); r += dr, c += dc) {
        const pos = r * p.cols + c;
        if (p.rocks[pos]) break;
        out.push(pos);
        if (friendAt.has(pos)) break; // protects that friend, but the line stops there
      }
    }
    return out;
  }
  const steps = f.kind === 'king' ? ALL_DIRS : f.kind === 'knight' ? KNIGHT_JUMPS : [[-1, -1], [-1, 1]] as const;
  for (const [dr, dc] of steps) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (onBoard(r, c) && !p.rocks[r * p.cols + c]) out.push(r * p.cols + c);
  }
  return out;
}

/** Every square watched by the friends (the grumpy king lifted off the board). Skips friend `skip`. */
export function coverage(p: MatePuzzle, friends: readonly Friend[], skip = -1): Set<number> {
  const friendAt = new Set(friends.map((f) => f.at));
  const out = new Set<number>();
  friends.forEach((f, i) => {
    if (i !== skip) for (const pos of watchedBy(p, f, friendAt)) out.add(pos);
  });
  return out;
}

/** Squares around the king he could still step to (or take a lonely friend on). */
export function escapes(p: MatePuzzle, friends: readonly Friend[]): number[] {
  const cover = coverage(p, friends);
  return kingZone(p).filter((pos) => {
    if (p.rocks[pos]) return false;
    const fi = friends.findIndex((f) => f.at === pos);
    if (fi < 0) return !cover.has(pos);
    return !coverage(p, friends, fi).has(pos);
  });
}

export function mateStatus(p: MatePuzzle, friends: readonly Friend[]): MateStatus {
  const check = coverage(p, friends).has(p.king);
  const free = escapes(p, friends).length > 0;
  if (check) return free ? 'check' : 'mate';
  return free ? 'free' : 'stalemate';
}

/** Can a `kind` friend be dropped on `pos`? (Ignores the tray friend being moved, if any.) */
export function canPlace(p: MatePuzzle, friends: readonly Friend[], kind: Kind, pos: number): boolean {
  if (pos < 0 || pos >= p.rows * p.cols) return false;
  if (p.rocks[pos] || pos === p.king || friends.some((f) => f.at === pos)) return false;
  if (kind === 'king' && near(p, pos, p.king)) return false; // kings never stand side by side
  if (kind === 'pawn' && pos < p.cols) return false; // a pawn on the top row would be a queen
  return true;
}

/**
 * Drop tray friend `tray` on `at`. Then the king shoos every tray friend
 * standing next to him that nobody protects (he could take it). Returns the
 * placements left on the board and the tray indexes sent back.
 */
export function drop(p: MatePuzzle, placed: readonly Placement[], tray: number, at: number): {
  placed: Placement[];
  shooed: number[];
} {
  let now = [...placed.filter((pl) => pl.tray !== tray), { tray, at }];
  const shooed: number[] = [];
  for (;;) {
    const friends = friendsOf(p, now);
    const lonely = now.find((pl, i) =>
      near(p, pl.at, p.king) && !coverage(p, friends, p.fixed.length + i).has(pl.at),
    );
    if (!lonely) return { placed: now, shooed };
    shooed.push(lonely.tray);
    now = now.filter((pl) => pl !== lonely);
  }
}

/**
 * Ways to finish from `placed`: each is a list of further drops, in an order
 * where the king never shoos anything. Stops after `limit` solutions.
 */
export function solveMate(p: MatePuzzle, placed: readonly Placement[] = [], limit = Infinity): Placement[][] {
  const found: Placement[][] = [];
  const seen = new Set<string>();
  const keyOf = (pls: readonly Placement[]) =>
    pls.map((pl) => `${p.tray[pl.tray]}${pl.at}`).sort().join(',');

  const walk = (now: readonly Placement[], path: Placement[]) => {
    if (found.length >= limit) return;
    if (mateStatus(p, friendsOf(p, now)) === 'mate') {
      found.push(path);
      return;
    }
    const used = new Set(now.map((pl) => pl.tray));
    const triedKinds = new Set<Kind>();
    for (let t = 0; t < p.tray.length; t++) {
      if (used.has(t) || triedKinds.has(p.tray[t])) continue;
      triedKinds.add(p.tray[t]); // two rooks in the tray are interchangeable
      const friends = friendsOf(p, now);
      for (let at = 0; at < p.rows * p.cols; at++) {
        if (!canPlace(p, friends, p.tray[t], at)) continue;
        const res = drop(p, now, t, at);
        if (res.shooed.length > 0) continue;
        const key = keyOf(res.placed);
        if (seen.has(key)) continue;
        seen.add(key);
        walk(res.placed, [...path, { tray: t, at }]);
        if (found.length >= limit) return;
      }
    }
  };
  walk(placed, []);
  return found;
}

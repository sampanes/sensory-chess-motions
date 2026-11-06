// Tiptoe puzzles (lab prototype): sneak past sleepy guards to the treats.
//
// Guards are the other side's pieces, asleep on the board. A guard "watches"
// the squares it attacks in real chess. If a friend ends a hop on a watched
// square, the guard wakes up and the friend scurries back to where it was:
// in chess, that friend would have been captured.
//
//   - A guard's lines are blocked by rocks, treats, friends and other guards.
//   - A guard pawn faces the friends, so it watches diagonally DOWN the board.
//   - A friend may boop (capture) a guard by landing on it, like eating a
//     treat. The guard goes home and stops watching. Booping a guard that
//     another guard watches wakes that other guard: guards protect each other.
//   - After every hop, no friend may stand on a watched square (moving one
//     friend can open a line onto another).
//   - Eat every treat to win. Guards may stay asleep.
//
// Grid text: the usual '.', '#', '*' and capital friends, plus lowercase
// letters for sleepy guards (k q r b n p).

import { KIND_BY_CHAR, LIMITS } from './puzzle.ts';
import type { Friend, Kind } from './types.ts';

export interface SneakPuzzle {
  rows: number;
  cols: number;
  rocks: readonly boolean[];
  treats: readonly number[];
  friends: readonly Friend[];
  guards: readonly Friend[];
}

export interface SneakState {
  friends: readonly Friend[];
  /** Bitmask of treats still on the board. */
  left: number;
  /** Bitmask of guards still on the board. */
  guards: number;
}

export interface SneakMove {
  friend: number;
  to: number;
}

export type HopResult =
  | { kind: 'ok'; state: SneakState; ate: number; booped: number; promoted: boolean }
  /** The hop lands on (or uncovers) a watched square: these guards wake up, and the friend goes back. */
  | { kind: 'wake'; by: number[]; watched: number[] };

type Dir = readonly [number, number];
const STRAIGHT: readonly Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: readonly Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: readonly Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: readonly Dir[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SLIDES: Partial<Record<Kind, readonly Dir[]>> = { rook: STRAIGHT, bishop: DIAGONAL, queen: ALL_DIRS };

export type SneakParse = { ok: true; puzzle: SneakPuzzle } | { ok: false; error: string };

export function parseSneak(grid: readonly string[]): SneakParse {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < LIMITS.minSize || rows > LIMITS.maxSize || cols < LIMITS.minSize || cols > LIMITS.maxSize) {
    return { ok: false, error: `Board must be ${LIMITS.minSize}-${LIMITS.maxSize} squares each way.` };
  }
  const rocks: boolean[] = [];
  const treats: number[] = [];
  const friends: Friend[] = [];
  const guards: Friend[] = [];
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) return { ok: false, error: `Row ${r + 1} has the wrong length.` };
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const pos = r * cols + c;
      rocks.push(ch === '#');
      if (ch === '.' || ch === '#') continue;
      if (ch === '*') {
        treats.push(pos);
        continue;
      }
      const kind = KIND_BY_CHAR[ch.toUpperCase()];
      if (!kind) return { ok: false, error: `Unknown square "${ch}".` };
      if (ch === ch.toUpperCase()) {
        if (kind === 'pawn' && r === 0) return { ok: false, error: 'A pawn cannot start on the top row.' };
        friends.push({ kind, at: pos });
      } else {
        guards.push({ kind, at: pos });
      }
    }
  }
  if (friends.length === 0 || friends.length > 2) return { ok: false, error: 'Needs one or two friends.' };
  if (guards.length === 0 || guards.length > 3) return { ok: false, error: 'Needs one to three guards.' };
  if (treats.length === 0 || treats.length > 8) return { ok: false, error: 'Needs one to eight treats.' };
  const puzzle = { rows, cols, rocks, treats, friends, guards };
  if (watchedFriends(puzzle, sneakStart(puzzle)).length > 0) {
    return { ok: false, error: 'A friend starts on a square a guard watches.' };
  }
  return { ok: true, puzzle };
}

export function mustParseSneak(grid: readonly string[]): SneakPuzzle {
  const res = parseSneak(grid);
  if (!res.ok) throw new Error(`Bad tiptoe puzzle: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

export function sneakStart(p: SneakPuzzle): SneakState {
  return {
    friends: p.friends.map((f) => ({ ...f })),
    left: (1 << p.treats.length) - 1,
    guards: (1 << p.guards.length) - 1,
  };
}

const treatAt = (p: SneakPuzzle, s: SneakState, pos: number) => {
  const i = p.treats.indexOf(pos);
  return i >= 0 && (s.left >> i) & 1 ? i : -1;
};
const guardAt = (p: SneakPuzzle, s: SneakState, pos: number) => {
  const i = p.guards.findIndex((g) => g.at === pos);
  return i >= 0 && (s.guards >> i) & 1 ? i : -1;
};
const friendAt = (s: SneakState, pos: number) => s.friends.findIndex((f) => f.at === pos);

/** Something stands here that stops a line: rock, treat, friend or guard. */
const solid = (p: SneakPuzzle, s: SneakState, pos: number) =>
  p.rocks[pos] || treatAt(p, s, pos) >= 0 || guardAt(p, s, pos) >= 0 || friendAt(s, pos) >= 0;

/** Squares one piece reaches, as a list of rays (each ray stops after the first solid square). */
function reach(p: SneakPuzzle, s: SneakState, kind: Kind, at: number, pawnDir: -1 | 1): number[] {
  const r0 = Math.floor(at / p.cols);
  const c0 = at % p.cols;
  const onBoard = (r: number, c: number) => r >= 0 && r < p.rows && c >= 0 && c < p.cols;
  const out: number[] = [];
  const slides = SLIDES[kind];
  if (slides) {
    for (const [dr, dc] of slides) {
      for (let r = r0 + dr, c = c0 + dc; onBoard(r, c); r += dr, c += dc) {
        const pos = r * p.cols + c;
        if (p.rocks[pos]) break;
        out.push(pos);
        if (solid(p, s, pos)) break;
      }
    }
    return out;
  }
  const steps: readonly Dir[] =
    kind === 'king' ? ALL_DIRS : kind === 'knight' ? KNIGHT_JUMPS : [[pawnDir, -1], [pawnDir, 1]];
  for (const [dr, dc] of steps) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (onBoard(r, c) && !p.rocks[r * p.cols + c]) out.push(r * p.cols + c);
  }
  return out;
}

/** Squares each sleeping guard watches right now. */
export function watchedBy(p: SneakPuzzle, s: SneakState): Map<number, number[]> {
  const out = new Map<number, number[]>();
  p.guards.forEach((g, gi) => {
    if ((s.guards >> gi) & 1) out.set(gi, reach(p, s, g.kind, g.at, 1));
  });
  return out;
}

export function watchedSquares(p: SneakPuzzle, s: SneakState): Set<number> {
  return new Set([...watchedBy(p, s).values()].flat());
}

/** Indexes of friends standing on a watched square. */
function watchedFriends(p: SneakPuzzle, s: SneakState): number[] {
  const w = watchedSquares(p, s);
  return s.friends.flatMap((f, i) => (w.has(f.at) ? [i] : []));
}

/** Every square friend `fi` may hop to (some of them wake a guard). */
export function sneakHops(p: SneakPuzzle, s: SneakState, fi: number): number[] {
  const f = s.friends[fi];
  const free = (pos: number) => !p.rocks[pos] && friendAt(s, pos) < 0;
  const food = (pos: number) => treatAt(p, s, pos) >= 0 || guardAt(p, s, pos) >= 0;
  if (f.kind !== 'pawn') return reach(p, s, f.kind, f.at, -1).filter(free);
  const r0 = Math.floor(f.at / p.cols);
  const c0 = f.at % p.cols;
  if (r0 === 0) return [];
  const out: number[] = [];
  const ahead = (r0 - 1) * p.cols + c0;
  if (free(ahead) && !food(ahead)) out.push(ahead);
  for (const pos of reach(p, s, 'pawn', f.at, -1)) if (free(pos) && food(pos)) out.push(pos);
  return out;
}

/** Try a hop (one returned by sneakHops). */
export function sneakHop(p: SneakPuzzle, s: SneakState, m: SneakMove): HopResult {
  const ate = treatAt(p, s, m.to);
  const booped = guardAt(p, s, m.to);
  const mover = s.friends[m.friend];
  const promoted = mover.kind === 'pawn' && Math.floor(m.to / p.cols) === 0;
  const next: SneakState = {
    friends: s.friends.map((f, i) => (i === m.friend ? { kind: promoted ? 'queen' : f.kind, at: m.to } : f)),
    left: ate >= 0 ? s.left & ~(1 << ate) : s.left,
    guards: booped >= 0 ? s.guards & ~(1 << booped) : s.guards,
  };
  const spots = new Set(next.friends.map((f) => f.at));
  const by: number[] = [];
  for (const [gi, squares] of watchedBy(p, next)) if (squares.some((q) => spots.has(q))) by.push(gi);
  if (by.length > 0) {
    // Show the lines of the guards that woke, as they stand once the friend arrived.
    const lines = watchedBy(p, next);
    return { kind: 'wake', by, watched: [...new Set(by.flatMap((gi) => lines.get(gi) ?? []))] };
  }
  return { kind: 'ok', state: next, ate, booped, promoted };
}

export function sneakWon(s: SneakState): boolean {
  return s.left === 0;
}

const KIND_CODE: Record<Kind, number> = { king: 0, queen: 1, rook: 2, bishop: 3, knight: 4, pawn: 5 };
function keyOf(s: SneakState): number {
  let key = s.left * 8 + s.guards;
  for (const f of s.friends) key = key * 256 + KIND_CODE[f.kind] * 40 + f.at;
  return key;
}

export type SneakSolve = { status: 'solved'; moves: SneakMove[] } | { status: 'stuck' } | { status: 'too-big' };

/** Fewest hops that finish without waking anyone. */
export function solveSneak(p: SneakPuzzle, start: SneakState, limit = 200_000): SneakSolve {
  if (sneakWon(start)) return { status: 'solved', moves: [] };
  const parent = new Map<number, { prev: number; move: SneakMove }>();
  const startKey = keyOf(start);
  const seen = new Set([startKey]);
  let frontier = [{ key: startKey, s: start }];
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const { key, s } of frontier) {
      for (let fi = 0; fi < s.friends.length; fi++) {
        for (const to of sneakHops(p, s, fi)) {
          const res = sneakHop(p, s, { friend: fi, to });
          if (res.kind !== 'ok') continue;
          const k = keyOf(res.state);
          if (seen.has(k)) continue;
          seen.add(k);
          parent.set(k, { prev: key, move: { friend: fi, to } });
          if (sneakWon(res.state)) {
            const moves: SneakMove[] = [];
            for (let at = k; at !== startKey; at = parent.get(at)!.prev) moves.unshift(parent.get(at)!.move);
            return { status: 'solved', moves };
          }
          if (seen.size > limit) return { status: 'too-big' };
          next.push({ key: k, s: res.state });
        }
      }
    }
    frontier = next;
  }
  return { status: 'stuck' };
}

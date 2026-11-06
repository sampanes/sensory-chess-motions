// Sneaking past sleepy guards: the rules behind tiptoe puzzles (eat every
// treat) and the pawn walk (get the little pawn friend home to the top row).
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
//
// Goals:
//   - 'treats': eat every treat. Guards may stay asleep.
//   - 'home': every pawn friend reaches the top row (and becomes a queen),
//     and any treats are eaten too.
//
// Race puzzles (the pawn walk, secretly a pawn race): guard pawns are awake
// and walk one square DOWN after each of your hops, unless something stands
// in front of them (a friend in front is safe: pawns only watch diagonally,
// so this is a blockade). A guard pawn that reaches the bottom row got home
// first and you start over. Getting your own pawn home first wins on the
// spot, before the guard pawn takes its step. A guard pawn may step next to
// a friend and watch it: then it is your move, like in chess, and your next
// hop must leave nobody watched (eat the guard pawn, or move away).
//
// Grid text: the usual '.', '#', '*' and capital friends, plus lowercase
// letters for guards (k q r b n p).

import { KIND_BY_CHAR, LIMITS } from './puzzle.ts';
import type { Friend, Kind } from './types.ts';

export interface SneakRules {
  goal: 'treats' | 'home';
  race: boolean;
}

export interface SneakPuzzle extends SneakRules {
  rows: number;
  cols: number;
  rocks: readonly boolean[];
  treats: readonly number[];
  friends: readonly Friend[];
  /** Where each guard starts. */
  guards: readonly Friend[];
}

export interface SneakState {
  friends: readonly Friend[];
  /** Bitmask of treats still on the board. */
  left: number;
  /** Bitmask of guards still on the board. */
  guards: number;
  /** Where each guard stands now (race pawns walk). */
  gpos: readonly number[];
}

export interface SneakMove {
  friend: number;
  to: number;
}

export type HopResult =
  | {
      kind: 'ok';
      state: SneakState;
      /** The board after the friend's hop, before any guard pawn walks. */
      hopped: SneakState;
      ate: number;
      booped: number;
      promoted: boolean;
      /** Guards that took a step after the hop. */
      walked: number[];
    }
  /** A friend ends up on a watched square: these guards wake up, and the hop is undone. */
  | { kind: 'wake'; by: number[]; watched: number[]; shown: SneakState }
  /** A racing guard pawn reached the bottom row first. */
  | { kind: 'beaten'; by: number[]; shown: SneakState; hopped: SneakState };

type Dir = readonly [number, number];
const STRAIGHT: readonly Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: readonly Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: readonly Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: readonly Dir[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SLIDES: Partial<Record<Kind, readonly Dir[]>> = { rook: STRAIGHT, bishop: DIAGONAL, queen: ALL_DIRS };

export type SneakParse = { ok: true; puzzle: SneakPuzzle } | { ok: false; error: string };

const TIPTOE: SneakRules = { goal: 'treats', race: false };

export function parseSneak(grid: readonly string[], rules: Partial<SneakRules> = {}): SneakParse {
  const { goal, race } = { ...TIPTOE, ...rules };
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
        if (race && kind === 'pawn' && r === rows - 1) return { ok: false, error: 'A racing guard pawn starts home already.' };
        guards.push({ kind, at: pos });
      }
    }
  }
  const home = goal === 'home';
  if (friends.length === 0 || friends.length > 2) return { ok: false, error: 'Needs one or two friends.' };
  if (home && !friends.some((f) => f.kind === 'pawn')) return { ok: false, error: 'Needs a pawn friend to walk home.' };
  if (guards.length > 3 || (!home && guards.length === 0)) return { ok: false, error: 'Needs one to three guards.' };
  if (treats.length > 8 || (!home && treats.length === 0)) return { ok: false, error: 'Needs one to eight treats.' };
  if (race && !guards.some((g) => g.kind === 'pawn')) return { ok: false, error: 'A race needs a guard pawn.' };
  const puzzle: SneakPuzzle = { rows, cols, rocks, treats, friends, guards, goal, race };
  if (watchedFriends(puzzle, sneakStart(puzzle)).length > 0) {
    return { ok: false, error: 'A friend starts on a square a guard watches.' };
  }
  return { ok: true, puzzle };
}

export function mustParseSneak(grid: readonly string[], rules: Partial<SneakRules> = {}): SneakPuzzle {
  const res = parseSneak(grid, rules);
  if (!res.ok) throw new Error(`Bad sneak puzzle: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

export function sneakStart(p: SneakPuzzle): SneakState {
  return {
    friends: p.friends.map((f) => ({ ...f })),
    left: (1 << p.treats.length) - 1,
    guards: (1 << p.guards.length) - 1,
    gpos: p.guards.map((g) => g.at),
  };
}

const alive = (s: SneakState, gi: number) => ((s.guards >> gi) & 1) === 1;
const treatAt = (p: SneakPuzzle, s: SneakState, pos: number) => {
  const i = p.treats.indexOf(pos);
  return i >= 0 && (s.left >> i) & 1 ? i : -1;
};
export const guardAt = (s: SneakState, pos: number) => s.gpos.findIndex((at, gi) => at === pos && alive(s, gi));
const friendAt = (s: SneakState, pos: number) => s.friends.findIndex((f) => f.at === pos);

/** Something stands here that stops a line: rock, treat, friend or guard. */
const solid = (p: SneakPuzzle, s: SneakState, pos: number) =>
  p.rocks[pos] || treatAt(p, s, pos) >= 0 || guardAt(s, pos) >= 0 || friendAt(s, pos) >= 0;

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

/** Squares each guard on the board watches right now. */
export function watchedBy(p: SneakPuzzle, s: SneakState): Map<number, number[]> {
  const out = new Map<number, number[]>();
  p.guards.forEach((g, gi) => {
    if (alive(s, gi)) out.set(gi, reach(p, s, g.kind, s.gpos[gi], 1));
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

/** Guards watching at least one friend (after a gray pawn's step: a threat to answer). */
export function watchers(p: SneakPuzzle, s: SneakState): number[] {
  const spots = new Set(s.friends.map((f) => f.at));
  const by: number[] = [];
  for (const [gi, squares] of watchedBy(p, s)) if (squares.some((q) => spots.has(q))) by.push(gi);
  return by;
}

/** True for a guard pawn that walks down the board (race puzzles only). */
export const isRacer = (p: SneakPuzzle, gi: number) => p.race && p.guards[gi].kind === 'pawn';

/** Every square friend `fi` may hop to (some of them wake a guard). */
export function sneakHops(p: SneakPuzzle, s: SneakState, fi: number): number[] {
  const f = s.friends[fi];
  const free = (pos: number) => !p.rocks[pos] && friendAt(s, pos) < 0;
  const food = (pos: number) => treatAt(p, s, pos) >= 0 || guardAt(s, pos) >= 0;
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

/** Racing guard pawns each take one step down, if the square in front is empty. */
function walk(p: SneakPuzzle, s: SneakState): { state: SneakState; walked: number[] } {
  if (!p.race) return { state: s, walked: [] };
  const gpos = [...s.gpos];
  const walked: number[] = [];
  p.guards.forEach((_, gi) => {
    if (!isRacer(p, gi) || !alive(s, gi)) return;
    const below = gpos[gi] + p.cols;
    if (below >= p.rows * p.cols || p.rocks[below]) return;
    const now = { ...s, gpos };
    if (treatAt(p, now, below) >= 0 || guardAt(now, below) >= 0 || friendAt(now, below) >= 0) return;
    gpos[gi] = below;
    walked.push(gi);
  });
  return { state: { ...s, gpos }, walked };
}

/**
 * A racing guard pawn can still take its next step. While one can, a lost race
 * plays out (the kid sees the gray pawn get home) instead of rewinding early.
 */
export function stillRacing(p: SneakPuzzle, s: SneakState): boolean {
  return walk(p, s).walked.length > 0;
}

/** Try a hop (one returned by sneakHops). */
export function sneakHop(p: SneakPuzzle, s: SneakState, m: SneakMove): HopResult {
  const ate = treatAt(p, s, m.to);
  const booped = guardAt(s, m.to);
  const mover = s.friends[m.friend];
  const promoted = mover.kind === 'pawn' && Math.floor(m.to / p.cols) === 0;
  const hopped: SneakState = {
    friends: s.friends.map((f, i) => (i === m.friend ? { kind: promoted ? 'queen' : f.kind, at: m.to } : f)),
    left: ate >= 0 ? s.left & ~(1 << ate) : s.left,
    guards: booped >= 0 ? s.guards & ~(1 << booped) : s.guards,
    gpos: s.gpos,
  };
  const wake = (shown: SneakState, by: number[]): HopResult => {
    // Show the lines of the guards that woke, as they stand once the friend arrived.
    const lines = watchedBy(p, shown);
    return { kind: 'wake', by, watched: [...new Set(by.flatMap((gi) => lines.get(gi) ?? []))], shown };
  };
  const by = watchers(p, hopped);
  if (by.length > 0) return wake(hopped, by);
  const ok = (state: SneakState, walked: number[]): HopResult =>
    ({ kind: 'ok', state, hopped, ate, booped, promoted, walked });
  if (sneakWon(p, hopped)) return ok(hopped, []);
  const { state, walked } = walk(p, hopped);
  const home = walked.filter((gi) => Math.floor(state.gpos[gi] / p.cols) === p.rows - 1);
  if (home.length > 0) return { kind: 'beaten', by: home, shown: state, hopped };
  return ok(state, walked);
}

export function sneakWon(p: SneakPuzzle, s: SneakState): boolean {
  if (s.left !== 0) return false;
  return p.goal !== 'home' || p.friends.every((f, i) => f.kind !== 'pawn' || s.friends[i].kind !== 'pawn');
}

function keyOf(s: SneakState): string {
  return `${s.left}|${s.guards}|${s.gpos.join(',')}|${s.friends.map((f) => f.kind[0] + f.kind[1] + f.at).join(',')}`;
}

export type SneakSolve = { status: 'solved'; moves: SneakMove[] } | { status: 'stuck' } | { status: 'too-big' };

/** Fewest hops that finish without waking anyone (or losing a race). */
export function solveSneak(p: SneakPuzzle, start: SneakState, limit = 200_000): SneakSolve {
  if (sneakWon(p, start)) return { status: 'solved', moves: [] };
  const parent = new Map<string, { prev: string; move: SneakMove }>();
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
          if (sneakWon(p, res.state)) {
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

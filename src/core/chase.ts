// Chase the slime (#/lab/chase): the slime moves now.
//
// Bedtime's slime is a lone king that stands still while friends are dropped
// around it. Here the friends already stand on the board and the kid moves
// them, one move per turn, the way they always move; after each move the slime
// takes one step (as a king does) to a square no friend watches. The kid wins
// by checkmate, exactly as in bedtime (src/core/mate.ts): watched, and nowhere
// to step. Secretly: a real endgame, king and queen (or rook) against a king.
//
//   - A friend standing next to the slime with nobody protecting it gets
//     eaten. In the game that move is undone, so the kid tries another.
//   - Every square around it watched but the slime itself not: stalemate.
//     Also undone.
//   - Your own king can never step next to the slime.
//
// The slime plays as well as it can. Every position is worked out before the
// first move (a small endgame table), so the slime always picks the step that
// keeps it free longest, and the hint hand knows the quickest way to win.
//
// Grid text: '.' grass, '#' rock, 'k' the slime, capitals (K Q R B N) for the
// friends. Pawns do not play: a pawn moves differently from how it catches.

import { KIND_BY_CHAR, LIMITS } from './puzzle.ts';
import { escapes, mateStatus, type MatePuzzle, type MateStatus } from './mate.ts';
import type { Friend, Kind } from './types.ts';

export interface ChasePuzzle {
  rows: number;
  cols: number;
  rocks: readonly boolean[];
  /** The friends, in a fixed order; a state lists their squares in the same order. */
  kinds: readonly Kind[];
  start: ChaseState;
}

export interface ChaseState {
  slime: number;
  friends: readonly number[];
}

/** Biggest board and team the endgame table is worked out for. */
export const CHASE_LIMITS = { maxSquares: 36, maxFriends: 2 };

type Dir = readonly [number, number];
const STRAIGHT: readonly Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: readonly Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: readonly Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: readonly Dir[] = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const SLIDES: Partial<Record<Kind, readonly Dir[]>> = { rook: STRAIGHT, bishop: DIAGONAL, queen: ALL_DIRS };

export type ChaseParse = { ok: true; puzzle: ChasePuzzle } | { ok: false; error: string };

export function parseChase(grid: readonly string[]): ChaseParse {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < LIMITS.minSize || cols < LIMITS.minSize || rows * cols > CHASE_LIMITS.maxSquares) {
    return { ok: false, error: `Board must be at least ${LIMITS.minSize} each way and at most ${CHASE_LIMITS.maxSquares} squares.` };
  }
  const rocks: boolean[] = [];
  const kinds: Kind[] = [];
  const at: number[] = [];
  let slime = -1;
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) return { ok: false, error: `Row ${r + 1} has the wrong length.` };
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      const pos = r * cols + c;
      rocks.push(ch === '#');
      if (ch === '.' || ch === '#') continue;
      if (ch === 'k') {
        if (slime >= 0) return { ok: false, error: 'Only one slime.' };
        slime = pos;
        continue;
      }
      const kind = KIND_BY_CHAR[ch];
      if (!kind) return { ok: false, error: `Unknown square "${ch}".` };
      if (kind === 'pawn') return { ok: false, error: 'Pawns do not chase.' };
      kinds.push(kind);
      at.push(pos);
    }
  }
  if (slime < 0) return { ok: false, error: 'Needs a slime (k).' };
  if (kinds.length === 0 || kinds.length > CHASE_LIMITS.maxFriends) {
    return { ok: false, error: `Needs 1-${CHASE_LIMITS.maxFriends} friends.` };
  }
  const puzzle: ChasePuzzle = { rows, cols, rocks, kinds, start: { slime, friends: at } };
  if (!legalForKid(puzzle, puzzle.start)) return { ok: false, error: 'The start is not a fair position (slime watched, or kings side by side).' };
  return { ok: true, puzzle };
}

export function mustParseChase(grid: readonly string[]): ChasePuzzle {
  const res = parseChase(grid);
  if (!res.ok) throw new Error(`Bad chase puzzle: ${res.error}\n${grid.join('\n')}`);
  return res.puzzle;
}

export function friendsIn(pz: ChasePuzzle, s: ChaseState): Friend[] {
  return pz.kinds.map((kind, i) => ({ kind, at: s.friends[i] }));
}

/** The same position as a bedtime board, so the bedtime rules answer for it. */
export function asMate(pz: ChasePuzzle, s: ChaseState): MatePuzzle {
  return { rows: pz.rows, cols: pz.cols, rocks: pz.rocks, king: s.slime, fixed: friendsIn(pz, s), tray: [] };
}

export function statusOf(pz: ChasePuzzle, s: ChaseState): MateStatus {
  return mateStatus(asMate(pz, s), friendsIn(pz, s));
}

const near = (cols: number, a: number, b: number) =>
  Math.max(Math.abs((a % cols) - (b % cols)), Math.abs(Math.floor(a / cols) - Math.floor(b / cols))) <= 1;

/** The kid may move from here: nobody overlaps, the kings are apart, and the slime is not watched. */
function legalForKid(pz: ChasePuzzle, s: ChaseState): boolean {
  const all = [s.slime, ...s.friends];
  if (new Set(all).size !== all.length || all.some((pos) => pz.rocks[pos])) return false;
  if (pz.kinds.some((k, i) => k === 'king' && near(pz.cols, s.friends[i], s.slime))) return false;
  const st = statusOf(pz, s);
  return st === 'free';
}

/** Squares friend `i` can move to. */
export function friendMoves(pz: ChasePuzzle, s: ChaseState, i: number): number[] {
  const kind = pz.kinds[i];
  const from = s.friends[i];
  const r0 = Math.floor(from / pz.cols);
  const c0 = from % pz.cols;
  const onBoard = (r: number, c: number) => r >= 0 && r < pz.rows && c >= 0 && c < pz.cols;
  const taken = (pos: number) => pz.rocks[pos] || pos === s.slime || s.friends.includes(pos);
  const out: number[] = [];
  const slides = SLIDES[kind];
  if (slides) {
    for (const [dr, dc] of slides) {
      for (let r = r0 + dr, c = c0 + dc; onBoard(r, c); r += dr, c += dc) {
        const pos = r * pz.cols + c;
        if (taken(pos)) break;
        out.push(pos);
      }
    }
    return out;
  }
  for (const [dr, dc] of kind === 'king' ? ALL_DIRS : KNIGHT_JUMPS) {
    const r = r0 + dr;
    const c = c0 + dc;
    if (!onBoard(r, c)) continue;
    const pos = r * pz.cols + c;
    if (taken(pos)) continue;
    if (kind === 'king' && near(pz.cols, pos, s.slime)) continue; // kings never stand side by side
    out.push(pos);
  }
  return out;
}

export function moveFriend(s: ChaseState, i: number, to: number): ChaseState {
  return { slime: s.slime, friends: s.friends.map((at, j) => (j === i ? to : at)) };
}

/** Where the slime may step: unwatched squares, or a friend next to it that nobody protects. */
export function slimeSteps(pz: ChasePuzzle, s: ChaseState): number[] {
  return escapes(asMate(pz, s), friendsIn(pz, s));
}

/** The friend (index) the slime would eat by stepping on `to`, or -1. */
export function eatenBy(s: ChaseState, to: number): number {
  return s.friends.indexOf(to);
}

/**
 * The endgame table: for every position, how many moves (counting both sides)
 * until checkmate with best play, or NEVER. `kid` is for the kid to move,
 * `slime` for the slime to move (0 there means it is checkmated).
 */
export interface ChaseTable {
  kid: Int16Array;
  slime: Int16Array;
}

export const NEVER = -1;

function indexOf(pz: ChasePuzzle, s: ChaseState): number {
  const n = pz.rows * pz.cols;
  let i = s.slime;
  for (const at of s.friends) i = i * n + at;
  return i;
}

function stateAt(pz: ChasePuzzle, index: number): ChaseState {
  const n = pz.rows * pz.cols;
  const friends: number[] = [];
  for (let k = pz.kinds.length - 1; k >= 0; k--) {
    friends[k] = index % n;
    index = Math.floor(index / n);
  }
  return { slime: index, friends };
}

export function solveChase(pz: ChasePuzzle): ChaseTable {
  const n = pz.rows * pz.cols;
  const size = n ** (pz.kinds.length + 1);
  const kid = new Int16Array(size).fill(NEVER);
  const slime = new Int16Array(size).fill(NEVER);
  // Moves, worked out once. Kid: each position's next positions (slime to move).
  // Slime: each position's next positions (kid to move); a position where the
  // slime can eat or is stalemated is a loss for the kid and keeps NEVER.
  const kidNext: number[][] = [];
  const slimeNext: number[][] = [];
  const kidLegal: number[] = [];
  const slimeLive: number[] = [];
  for (let i = 0; i < size; i++) {
    const s = stateAt(pz, i);
    const all = [s.slime, ...s.friends];
    if (new Set(all).size !== all.length || all.some((pos) => pz.rocks[pos])) continue;
    if (pz.kinds.some((k, f) => k === 'king' && near(pz.cols, s.friends[f], s.slime))) continue;
    const st = statusOf(pz, s);
    if (st === 'free') {
      kidLegal.push(i);
      kidNext[i] = pz.kinds.flatMap((_, f) => friendMoves(pz, s, f).map((to) => indexOf(pz, moveFriend(s, f, to))));
    }
    // As a slime-to-move position (it may be watched: the kid just moved).
    if (st === 'mate') {
      slime[i] = 0;
      continue;
    }
    if (st === 'stalemate') continue;
    const steps = slimeSteps(pz, s);
    if (steps.some((to) => eatenBy(s, to) >= 0)) continue; // it eats a friend: the kid lost that one
    slimeLive.push(i);
    slimeNext[i] = steps.map((to) => indexOf(pz, { slime: to, friends: s.friends }));
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const i of kidLegal) {
      let best = NEVER;
      for (const j of kidNext[i]) {
        const v = slime[j];
        if (v !== NEVER && (best === NEVER || v + 1 < best)) best = v + 1;
      }
      if (best !== kid[i]) {
        kid[i] = best;
        changed = true;
      }
    }
    for (const i of slimeLive) {
      let worst = 0;
      for (const j of slimeNext[i]) {
        const v = kid[j];
        if (v === NEVER) {
          worst = NEVER;
          break;
        }
        if (v + 1 > worst) worst = v + 1;
      }
      if (worst !== slime[i]) {
        slime[i] = worst;
        changed = true;
      }
    }
  }
  return { kid, slime };
}

/** Kid moves left to checkmate from a kid-to-move position, or NEVER. */
export function movesToWin(pz: ChasePuzzle, t: ChaseTable, s: ChaseState): number {
  const v = t.kid[indexOf(pz, s)];
  return v === NEVER ? NEVER : (v + 1) / 2;
}

/** The slime's step: eat a friend nobody protects, else the step that keeps it free longest. */
export function slimeChoice(pz: ChasePuzzle, t: ChaseTable, s: ChaseState): number | null {
  const steps = slimeSteps(pz, s);
  if (steps.length === 0) return null;
  const eat = steps.find((to) => eatenBy(s, to) >= 0);
  if (eat !== undefined) return eat;
  const centerR = (pz.rows - 1) / 2;
  const centerC = (pz.cols - 1) / 2;
  const score = (to: number) => {
    const v = t.kid[indexOf(pz, { slime: to, friends: s.friends })];
    const off = Math.hypot(Math.floor(to / pz.cols) - centerR, (to % pz.cols) - centerC);
    // Never caught first, then the longest chase, then toward the middle of the board.
    return (v === NEVER ? 10000 : v * 10) - off;
  };
  return steps.reduce((a, b) => (score(b) > score(a) ? b : a));
}

/** The quickest winning move from here: [friend, square], or null if there is none. */
export function bestMove(pz: ChasePuzzle, t: ChaseTable, s: ChaseState): [number, number] | null {
  let best: [number, number] | null = null;
  let bestV = Infinity;
  pz.kinds.forEach((_, f) => {
    for (const to of friendMoves(pz, s, f)) {
      const v = t.slime[indexOf(pz, moveFriend(s, f, to))];
      if (v !== NEVER && v < bestV) {
        bestV = v;
        best = [f, to];
      }
    }
  });
  return best;
}

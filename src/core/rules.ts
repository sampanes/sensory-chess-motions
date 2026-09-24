// How each friend moves. These are the real chess moves, with treats playing
// the part of pieces you can capture:
//
//   - Nobody can land on a rock or on another friend.
//   - Landing on a treat eats it.
//   - Sliders (rook, bishop, queen) stop at the first treat in their path.
//   - The knight jumps; nothing in between matters.
//   - The pawn steps up one square onto grass, and can only eat a treat one
//     square diagonally up. A treat straight ahead blocks it. On the top row
//     it turns into a queen.

import type { GameState, Kind, Move, Puzzle } from './types.ts';

type Dir = readonly [number, number];

const STRAIGHT: readonly Dir[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAL: readonly Dir[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ALL_DIRS: readonly Dir[] = [...STRAIGHT, ...DIAGONAL];
const KNIGHT_JUMPS: readonly Dir[] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const SLIDES: Partial<Record<Kind, readonly Dir[]>> = {
  rook: STRAIGHT,
  bishop: DIAGONAL,
  queen: ALL_DIRS,
};

export function treatIndexAt(p: Puzzle, s: GameState, pos: number): number {
  const i = p.treats.indexOf(pos);
  return i >= 0 && (s.left >> i) & 1 ? i : -1;
}

export function friendIndexAt(s: GameState, pos: number): number {
  return s.friends.findIndex((f) => f.at === pos);
}

/** Every square friend `fi` may move to right now. */
export function hopsFor(p: Puzzle, s: GameState, fi: number): number[] {
  const f = s.friends[fi];
  const r0 = Math.floor(f.at / p.cols);
  const c0 = f.at % p.cols;
  const onBoard = (r: number, c: number) => r >= 0 && r < p.rows && c >= 0 && c < p.cols;
  const blocked = (pos: number) => p.rocks[pos] || friendIndexAt(s, pos) >= 0;
  const out: number[] = [];

  const slides = SLIDES[f.kind];
  if (slides) {
    for (const [dr, dc] of slides) {
      let r = r0 + dr;
      let c = c0 + dc;
      while (onBoard(r, c)) {
        const pos = r * p.cols + c;
        if (blocked(pos)) break;
        out.push(pos);
        if (treatIndexAt(p, s, pos) >= 0) break;
        r += dr;
        c += dc;
      }
    }
    return out;
  }

  if (f.kind === 'king' || f.kind === 'knight') {
    for (const [dr, dc] of f.kind === 'king' ? ALL_DIRS : KNIGHT_JUMPS) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (!onBoard(r, c)) continue;
      const pos = r * p.cols + c;
      if (!blocked(pos)) out.push(pos);
    }
    return out;
  }

  // Pawn
  const up = r0 - 1;
  if (up < 0) return out;
  const ahead = up * p.cols + c0;
  if (!blocked(ahead) && treatIndexAt(p, s, ahead) < 0) out.push(ahead);
  for (const dc of [-1, 1]) {
    const c = c0 + dc;
    if (!onBoard(up, c)) continue;
    const pos = up * p.cols + c;
    if (!blocked(pos) && treatIndexAt(p, s, pos) >= 0) out.push(pos);
  }
  return out;
}

export interface MoveResult {
  state: GameState;
  /** Index of the treat eaten by this move, or -1. */
  ate: number;
  /** True when a pawn reached the top row and became a queen. */
  promoted: boolean;
}

/** Apply a move, or return null if it is not allowed. */
export function applyMove(p: Puzzle, s: GameState, m: Move): MoveResult | null {
  if (m.friend < 0 || m.friend >= s.friends.length) return null;
  if (!hopsFor(p, s, m.friend).includes(m.to)) return null;

  const ate = treatIndexAt(p, s, m.to);
  const mover = s.friends[m.friend];
  const promoted = mover.kind === 'pawn' && Math.floor(m.to / p.cols) === 0;
  const friends = s.friends.map((f, i) =>
    i === m.friend ? { kind: promoted ? ('queen' as Kind) : f.kind, at: m.to } : f,
  );
  const left = ate >= 0 ? s.left & ~(1 << ate) : s.left;
  return { state: { friends, left }, ate, promoted };
}

export function isWon(s: GameState): boolean {
  return s.left === 0;
}

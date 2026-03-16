/**
 * The First Board — World 9 levels (R1–R5).
 *
 * These levels are played on a full 8×8 board and each showcase a single
 * piece type from a starting position that mirrors its chess opening square.
 * The player already met each piece in the earlier worlds; here they see it
 * on the "real" board for the first time.
 */

import { Level } from '../../types';

const EMPTY_8x8 = { fences: [], rivers: [], bridges: [], food: [] };

// ── R1 "Open File" (rook, bottom-left → top-left) ──────────────────────────
const r1: Level = {
  name: 'Open File',
  description: 'The rook stands at the corner of the great board. A clear file stretches ahead — race to the other end.',
  hint: 'Move straight up the a-file. The rook crosses the whole board in one move.',
  pieceType: 'rook',
  start: { row: 7, col: 0 },
  goal:  { row: 0, col: 0 },
  boardHeight: 8,
  boardWidth: 8,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY_8x8,
};

// ── R2 "Long Diagonal" (bishop) ─────────────────────────────────────────────
const r2: Level = {
  name: 'Long Diagonal',
  description: 'The bishop commands the longest diagonal on the board. Slice straight from corner to corner.',
  hint: 'One diagonal move covers the entire board.',
  pieceType: 'bishop',
  start: { row: 7, col: 0 },
  goal:  { row: 0, col: 7 },
  boardHeight: 8,
  boardWidth: 8,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY_8x8,
};

// ── R3 "Knight's Tour (mini)" (knight) ──────────────────────────────────────
// Knight from b1 → c3 → d5 → e7 → f5 → g7 or similar 4-move path to top
const r3: Level = {
  name: "Knight's Journey",
  description: "The knight's L-shaped hops feel different on a bigger board. Find your way to the far side.",
  hint: "Each hop is still two-and-one — but there's a lot more room now.",
  pieceType: 'knight',
  start: { row: 7, col: 1 },
  goal:  { row: 0, col: 2 },
  boardHeight: 8,
  boardWidth: 8,
  starThresholds: { three: 4, two: 6 },
  obstacles: EMPTY_8x8,
};

// ── R4 "Queen's Gambit" (queen) ──────────────────────────────────────────────
const r4: Level = {
  name: "Queen's March",
  description: 'The queen rules every rank, file, and diagonal. Charge straight up the d-file to her throne.',
  hint: 'The queen can cross the whole board in a single straight move.',
  pieceType: 'queen',
  start: { row: 7, col: 3 },
  goal:  { row: 0, col: 3 },
  boardHeight: 8,
  boardWidth: 8,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY_8x8,
};

// ── R5 "King's Steps" (king) ─────────────────────────────────────────────────
const r5: Level = {
  name: "King's Steps",
  description: "The king is careful — one step at a time. Guide him up the board to his safe square.",
  hint: 'The king moves one square in any direction. Plan a straight path.',
  pieceType: 'king',
  start: { row: 7, col: 4 },
  goal:  { row: 4, col: 4 },
  boardHeight: 8,
  boardWidth: 8,
  starThresholds: { three: 3, two: 5 },
  obstacles: EMPTY_8x8,
};

export const revealLevels: Level[] = [r1, r2, r3, r4, r5];

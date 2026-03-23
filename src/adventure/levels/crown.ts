/**
 * The Pawn's Crown — World 10 levels (C1–C5).
 *
 * Each level ends with pawn promotion: the pawn reaches its goal and the
 * player chooses what it becomes. The levels progress from a single discovery
 * step to a full 8×8 diagonal-capture gauntlet.
 */

import { Level } from '../../types';

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };

// ── C1 "One Last Step" ──────────────────────────────────────────────────────
// The pawn is already at the penultimate row. One step — and it's done.
// Pure discovery: reach the goal, watch what happens.
const c1: Level = {
  name: 'One Last Step',
  description: 'The pawn stands at the edge of the world. One more step forward — and something extraordinary happens.',
  hint: 'Move the pawn forward. That\'s all.',
  pieceType: 'pawn',
  start: { row: 1, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 5,
  boardWidth:  5,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY,
  allowPromotion: true,
};

// ── C2 "The Long March" ──────────────────────────────────────────────────────
// The full 8×8 board. Seven patient steps — the whole length of the real board.
const c2: Level = {
  name: 'The Long March',
  description: 'Seven steps across the great board. The pawn that reaches the far side earns the right to choose.',
  hint: 'Head straight up. The pawn earns its crown at the end.',
  pieceType: 'pawn',
  start: { row: 7, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 8,
  boardWidth:  8,
  starThresholds: { three: 7, two: 9 },
  obstacles: EMPTY,
  allowPromotion: true,
};

// ── C3 "Crown in Combat" ────────────────────────────────────────────────────
// Two enemy pawns block the way — but they\'re diagonally positioned.
// The pawn must capture both to clear the path to its crown.
// River cells (3,1) and (2,2) force the diagonal captures.
const c3: Level = {
  name: 'Crown in Combat',
  description: 'The path is blocked — but a pawn that captures diagonally clears its own road. Fight your way to the crown.',
  hint: 'Pawns capture diagonally. Each shadow pawn is one step sideways and one step forward.',
  pieceType: 'pawn',
  start: { row: 4, col: 1 },
  goal:  { row: 0, col: 3 },
  boardHeight: 5,
  boardWidth:  5,
  starThresholds: { three: 4, two: 6 },
  obstacles: {
    fences: [],
    rivers: [{ row: 3, col: 1 }, { row: 2, col: 2 }],
    bridges: [],
    food: [],
  },
  enemies: [
    { row: 3, col: 2, pieceType: 'pawn' },
    { row: 2, col: 3, pieceType: 'pawn' },
  ],
  allowPromotion: true,
};

// ── C4 "The Diagonal March" ─────────────────────────────────────────────────
// Four enemy pawns form a perfect diagonal staircase. The only route to the
// goal is to capture every single one — the whole journey is diagonal.
// Board: 6 rows × 5 cols.
const c4: Level = {
  name: 'The Diagonal March',
  description: 'Four shadows stand in a diagonal line from corner to corner. The only path to the crown is straight through them.',
  hint: 'Follow the diagonal — every capture opens the next.',
  pieceType: 'pawn',
  start: { row: 5, col: 0 },
  goal:  { row: 0, col: 4 },
  boardHeight: 6,
  boardWidth:  5,
  scrollAxis: 'vertical',
  starThresholds: { three: 5, two: 7 },
  obstacles: EMPTY,
  enemies: [
    { row: 4, col: 1, pieceType: 'pawn' },
    { row: 3, col: 2, pieceType: 'pawn' },
    { row: 2, col: 3, pieceType: 'pawn' },
    { row: 1, col: 4, pieceType: 'pawn' },
  ],
  allowPromotion: true,
};

// ── C5 "The Underdog" ────────────────────────────────────────────────────────
// Six enemy pawns form a perfect zigzag across the full 8×8 board.
// The pawn must capture every one in an alternating diagonal pattern to
// reach the goal. The classic "underdog wins it all" moment.
// Path: (7,3)→cap(6,4)→cap(5,3)→cap(4,4)→cap(3,3)→cap(2,4)→cap(1,3)→(0,3)
const c5: Level = {
  name: 'The Underdog',
  description: 'Six shadows bar the path in a zigzag across the whole board. Step by step — diagonal by diagonal — the pawn claims its crown.',
  hint: 'Capture in an alternating pattern: right, left, right, left...',
  pieceType: 'pawn',
  start: { row: 7, col: 3 },
  goal:  { row: 0, col: 3 },
  boardHeight: 8,
  boardWidth:  5,
  scrollAxis: 'vertical',
  starThresholds: { three: 7, two: 10 },
  obstacles: EMPTY,
  enemies: [
    { row: 6, col: 4, pieceType: 'pawn' },
    { row: 5, col: 3, pieceType: 'pawn' },
    { row: 4, col: 4, pieceType: 'pawn' },
    { row: 3, col: 3, pieceType: 'pawn' },
    { row: 2, col: 4, pieceType: 'pawn' },
    { row: 1, col: 3, pieceType: 'pawn' },
  ],
  allowPromotion: true,
};

export const crownLevels: Level[] = [c1, c2, c3, c4, c5];

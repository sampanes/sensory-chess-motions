/**
 * The First Check — World 11 levels (P1a–P5b).
 *
 * 5 pairs of levels. Each pair: first the child plays as the king avoiding
 * watched squares (defender), then as the attacking piece placing itself so
 * its valid moves cover key squares (attacker / controlMode).
 *
 * The word "checkmate" appears exactly once — at the end of P4b.
 */

import { Level } from '../../types';

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };
// Sentinel: no flag shown (goal off-board)
const NO_GOAL = { row: -1, col: -1 };

// ── Pair 1 — Rook vs King ────────────────────────────────────────────────────

/** P1a — King must cross the board; an enemy king guards the center. Navigate around it. */
const p1a: Level = {
  name: 'Dodge the Guard',
  description: 'An enemy king guards the center. It watches every square around it — the king must go the long way.',
  hint: 'The guard controls a ring of squares. Hug the edges to get past.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 8, two: 12 },
  obstacles: EMPTY,
  guardPieces: [{ pieceType: 'king', position: { row: 2, col: 2 } }],
};

/** P1b — Move the rook to watch the key column. */
const p1b: Level = {
  name: 'Raise the Guard',
  description: 'Now you control the rook. Move it so it watches the column the king wants to cross.',
  hint: 'A rook placed anywhere in a column watches every square in that column.',
  pieceType: 'rook',
  start: { row: 4, col: 0 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY,
  controlMode: true,
  targetSquares: [{ row: 1, col: 2 }, { row: 2, col: 2 }, { row: 3, col: 2 }],
};

// ── Pair 2 — Bishop vs King ──────────────────────────────────────────────────

/** P2a — King must cross while a bishop guard cuts the board along its diagonals. */
const p2a: Level = {
  name: "The Bishop's Line",
  description: "A bishop sits in the center, watching both diagonals. The king must find the lanes the bishop can't see.",
  hint: "The bishop controls the diagonals. Move along the straight rows and columns — those are safe.",
  pieceType: 'king',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 6, two: 9 },
  obstacles: EMPTY,
  guardPieces: [{ pieceType: 'bishop', position: { row: 2, col: 2 } }],
};

/** P2b — Move the bishop so its diagonal covers the two key squares. */
const p2b: Level = {
  name: 'Cast the Shadow',
  description: 'Now you hold the bishop. Position it so its diagonal watches both key squares at once.',
  hint: 'A bishop on the right diagonal can watch any square on that line.',
  pieceType: 'bishop',
  start: { row: 0, col: 0 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 1, two: 2 },
  obstacles: EMPTY,
  controlMode: true,
  // From (2,2), bishop valid moves include both (3,1) and (1,3)
  targetSquares: [{ row: 3, col: 1 }, { row: 1, col: 3 }],
};

// ── Pair 3 — Two Threats ─────────────────────────────────────────────────────

/** P3a — King navigates around two knight guards whose scattered threats form an X across the board. */
const p3a: Level = {
  name: 'Two Dangers',
  description: 'Two enemy knights guard the board. Their reach is strange — they jump to scattered squares. Find the path their shadows don\'t cover.',
  hint: 'Knights don\'t block in straight lines. Hug the left edge or the right edge all the way around.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 6, two: 9 },
  obstacles: EMPTY,
  guardPieces: [
    { pieceType: 'knight', position: { row: 1, col: 3 } },
    { pieceType: 'knight', position: { row: 3, col: 1 } },
  ],
};

/**
 * P3b — Move the rook to a square that simultaneously watches two target squares
 * on different rows and columns (the intersection of a column and row).
 */
const p3b: Level = {
  name: 'Double Threat',
  description: 'Can you guard two squares at once with a single rook move? Find the square that watches both.',
  hint: 'A rook placed at the crossing of a row and a column watches both directions.',
  pieceType: 'rook',
  start: { row: 4, col: 4 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 3 },
  obstacles: EMPTY,
  controlMode: true,
  // From (1,1): valid moves include (2,1) (same col) and (1,2) (same row)
  targetSquares: [{ row: 2, col: 1 }, { row: 1, col: 2 }],
};

// ── Pair 4 — Checkmate ───────────────────────────────────────────────────────

/** P4a — King must navigate through a gauntlet of watched squares. */
const p4a: Level = {
  name: 'Closing In',
  description: 'The guards surround the path. The king has fewer and fewer safe squares to step on.',
  hint: 'Hug the edges and move one diagonal at a time.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 8, two: 11 },
  obstacles: EMPTY,
  watchedSquares: [
    { row: 1, col: 1 }, { row: 2, col: 1 }, { row: 3, col: 1 },
    { row: 1, col: 2 }, { row: 1, col: 3 },
  ],
};

/**
 * P4b — The checkmate moment.
 * The king hides in the corner (0,0), blocked by a river so the queen can't land there.
 * The queen must reach (1,2) to watch all three escape squares: (0,1),(1,0),(1,1).
 * When all three are covered, the checkmate screen fires.
 */
const p4b: Level = {
  name: 'Checkmate!',
  description: 'The king hides in the corner. Move your queen to a square that watches every escape.',
  hint: 'Find the one square from which your queen watches (0,1), (1,0), and (1,1) all at once.',
  pieceType: 'queen',
  start: { row: 4, col: 0 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 3 },
  obstacles: { fences: [], rivers: [{ row: 0, col: 0 }], bridges: [], food: [] },
  controlMode: true,
  targetSquares: [{ row: 0, col: 1 }, { row: 1, col: 0 }, { row: 1, col: 1 }],
  checkmateMoment: true,
};

// ── Pair 5 — The Royal Guard ─────────────────────────────────────────────────

/** P5a — King navigates past a bishop guard whose diagonals block the direct path. */
const p5a: Level = {
  name: 'Safe Passage',
  description: 'A bishop holds the corner and watches two long diagonals. The straight path is cut off — but the king can always find another way.',
  hint: 'The bishop blocks the diagonal route. Go around it — left side or right side.',
  pieceType: 'king',
  start: { row: 2, col: 2 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 3, two: 5 },
  obstacles: EMPTY,
  guardPieces: [{ pieceType: 'bishop', position: { row: 0, col: 2 } }],
};

/**
 * P5b — Pawn captures its way to a guarding position.
 * River at (3,1) blocks straight, forcing a diagonal capture.
 * Once at (2,2) the pawn "guards" the squares diagonally ahead, completing its duty.
 */
const p5b: Level = {
  name: 'The Pawn Guard',
  description: 'Move the pawn forward to guard the king\'s path. A pawn steps forward — and captures diagonally.',
  hint: 'The river blocks the straight path. Capture the shadow pawn to keep moving.',
  pieceType: 'pawn',
  start: { row: 4, col: 1 },
  goal:  { row: 2, col: 2 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 3 },
  obstacles: {
    fences: [],
    rivers: [{ row: 3, col: 1 }],
    bridges: [],
    food: [],
  },
  enemies: [{ row: 3, col: 2, pieceType: 'pawn' }],
};

export const firstCheckLevels: Level[] = [p1a, p1b, p2a, p2b, p3a, p3b, p4a, p4b, p5a, p5b];

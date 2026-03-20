/**
 * The Blind Spot — World 14 hunt levels (H1–H6).
 *
 * The hunt mechanic: an enemy piece sits on the board. Its threat zone is
 * impassable. The player must find the angle outside its vision and capture it.
 *
 * Teaching payoff table:
 *   Rook  → blind to diagonals → hunted by Bishop
 *   Bishop → blind to rows/cols → hunted by Rook
 *   Queen  → blind to L-shapes  → hunted by Knight
 *
 * Three pairs: each pair escalates the move count (2 → 3).
 */

import { Level } from '../../types';

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };
const NO_GOAL = { row: -1, col: -1 };

// ── Pair 1 — Bishop hunts Rook ──────────────────────────────────────────────

/**
 * H1 — "The Rook's Blind Side"
 * Rook at (1,3). Its row and column are rivers. Bishop at (4,2) finds the
 * diagonal approach — the rook can't see diagonals at all.
 *
 * Min route: (4,2)→(3,1) [move 1], (3,1)→(1,3) via (2,2) [move 2].
 */
const h1: Level = {
  name: "The Rook's Blind Side",
  description: 'An enemy rook guards its row and column. But rooks cannot see diagonals. Approach from the corner it never watches.',
  hint: "Move diagonally — the rook's row and column are blocked, but its corners are wide open.",
  pieceType: 'bishop',
  start: { row: 4, col: 2 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 4 },
  obstacles: EMPTY,
  huntTarget: { pieceType: 'rook', position: { row: 1, col: 3 } },
};

/**
 * H2 — "Around the Wall"
 * Rook at (0,2). Harder because col 2 and row 0 together block the obvious
 * diagonals. Bishop at (4,4) must zigzag: (4,4)→(3,3)→(2,4)→(0,2).
 *
 * Min route: 3 moves.
 */
const h2: Level = {
  name: 'Around the Wall',
  description: "The rook watches its row and column. One diagonal is blocked — so the bishop must take the long way around.",
  hint: 'One diagonal is cut off. Find a second diagonal that leads to the other side.',
  pieceType: 'bishop',
  start: { row: 4, col: 4 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 3, two: 5 },
  obstacles: EMPTY,
  huntTarget: { pieceType: 'rook', position: { row: 0, col: 2 } },
};

// ── Pair 2 — Rook hunts Bishop ──────────────────────────────────────────────

/**
 * H3 — "The Straight Path"
 * Bishop at (2,2). Both diagonals are rivers. Rook at (4,3) must slide
 * around the X to reach the bishop along a rank or file.
 *
 * Min route: (4,3)→(4,2) [move 1], (4,2)→(2,2) via (3,2) [move 2].
 */
const h3: Level = {
  name: 'The Straight Path',
  description: 'A bishop guards its diagonals — but can it see straight lines? The rook travels in a direction the bishop never watches.',
  hint: "The bishop watches the X-shape. Move straight — along a row, then a column.",
  pieceType: 'rook',
  start: { row: 4, col: 3 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 4 },
  obstacles: EMPTY,
  huntTarget: { pieceType: 'bishop', position: { row: 2, col: 2 } },
};

/**
 * H4 — "The Long Way Around"
 * Bishop at (0,0). Only one diagonal (down-right): (1,1),(2,2),(3,3),(4,4).
 * Extra river at (4,0) blocks the obvious col-0 shortcut.
 * Rook at (4,2) must go: (4,2)→(3,2)→(3,0)→(0,0). Three moves.
 *
 * Min route: 3 moves.
 */
const h4: Level = {
  name: 'The Long Way Around',
  description: 'The bishop sits in the corner watching one long diagonal. The direct path is blocked — but the rook has another way.',
  hint: 'The diagonal runs down the middle. Go around it: up one column, then across a row.',
  pieceType: 'rook',
  start: { row: 4, col: 2 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 3, two: 5 },
  obstacles: { fences: [], rivers: [{ row: 4, col: 0 }], bridges: [], food: [] },
  huntTarget: { pieceType: 'bishop', position: { row: 0, col: 0 } },
};

// ── Pair 3 — Knight hunts Queen ─────────────────────────────────────────────

/**
 * H5 — "The Knight's Secret"
 * Queen at (0,4). Threatens row 0, col 4, and the down-left diagonal.
 * Knight at (4,2) uses L-jumps to approach: (4,2)→(2,3)→(0,4).
 *
 * Min route: 2 moves.
 */
const h5: Level = {
  name: "The Knight's Secret",
  description: "The queen watches every row, every column, every diagonal. Almost every square around her is guarded. But the knight doesn't move in straight lines.",
  hint: "The queen can't see L-shapes. Jump from a square she's never watching.",
  pieceType: 'knight',
  start: { row: 4, col: 2 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 2, two: 4 },
  obstacles: EMPTY,
  huntTarget: { pieceType: 'queen', position: { row: 0, col: 4 } },
};

/**
 * H6 — "The Hunt's End"
 * Queen at (1,1). Threatens row 1, col 1, and both diagonals.
 * Knight at (4,3) must find: (4,3)→(2,4)→(0,3)→(1,1). Three L-jumps.
 *
 * Only one correct 3-move path — the other approach square (2,2) is a river.
 * Min route: 3 moves.
 */
const h6: Level = {
  name: "The Hunt's End",
  description: "The queen's vision covers almost the whole board. The knight finds the one angle she cannot see — then strikes.",
  hint: 'One approach square is safe. Two jumps to find it, one jump to reach her.',
  pieceType: 'knight',
  start: { row: 4, col: 3 },
  goal: NO_GOAL,
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 3, two: 5 },
  obstacles: EMPTY,
  huntTarget: { pieceType: 'queen', position: { row: 1, col: 1 } },
};

export const huntLevels: Level[] = [h1, h2, h3, h4, h5, h6];

import { Level } from '../../types';
import { DuoLevel } from '../duoLevelDef';

// ─── Queen's Realm — World 6 ──────────────────────────────────────────────────
// Teaching arc: the queen combines rook + bishop movement. The world climaxes
// with the "watched squares" mechanic — cells her own guards patrol that she
// cannot enter. Only the knight can pass through them.
//
// Q1  1 move  — Wide Open scroll: queen fires straight up 11 rows
// Q2  1 move  — Diagonal Reach: corner to corner
// Q3  1 move  — Straight Power (REMIX source at index 2): rook-style slide
// Q4  2 moves — Combined Path: diagonal then straight (no obstacles needed)
// Q5  2 moves — First Barrier: fences force a diagonal detour
// Q6  2 moves — River and Ridge: river barrier, one bridge
// Q7  2 moves — The Watchers: watched squares block center; queen uses edges
// Q8  6 moves — The Approach (duo: knight + king): knight jumps watched zones
// Q9 11 moves — The Proof (duo scroll): knight hops 5 times, king walks col 4

// ─── Solo queen levels (Q1–Q7) ───────────────────────────────────────────────

export const queenSoloLevels: Level[] = [
  {
    // Q1 — The Wide Open [↕ scroll] 11-row
    // Queen at bottom, slides straight to goal at top — 1 move.
    // Teaches: the queen's reach is unlike any piece seen so far.
    name: 'The Wide Open',
    description: 'The queen can go anywhere — and all at once. Show her the way!',
    hint: 'The queen slides in any direction, all the way to the end. Try going straight up!',
    pieceType: 'queen',
    start: { row: 10, col: 2 },
    goal:  { row: 0,  col: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    boardHeight: 11, boardWidth: 5, scrollAxis: 'vertical',
    starThresholds: { three: 1, two: 3 },
  },

  {
    // Q2 — Diagonal Reach 5×5
    // (4,0) → (0,4): pure diagonal in 1 move. Teaches bishop-style movement.
    name: 'Diagonal Reach',
    description: 'Corner to corner — the queen sees the whole board at once.',
    hint: 'The queen can slide diagonally, just like the bishop. One move from corner to corner!',
    pieceType: 'queen',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 4 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    starThresholds: { three: 1, two: 3 },
  },

  {
    // Q3 — Straight Power 5×5 ← REMIX SOURCE (index 2)
    // (4,2) → (0,2): straight up in 1 move. Teaches rook-style movement.
    // Remix: same board as bishop — shows bishop can't go straight.
    name: 'Straight Power',
    description: 'The queen fires in a straight line — and nothing gets in her way.',
    hint: 'The queen slides like the rook — all the way in one straight shot!',
    pieceType: 'queen',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    starThresholds: { three: 1, two: 3 },
  },

  {
    // Q4 — The Combined Path 5×5
    // (4,0) → (0,3): not on same row/col/diagonal — must use 2 moves.
    // Optimal: (4,0)→(1,3) diagonal [dr=-3,dc=+3], then (1,3)→(0,3) straight. 2 moves.
    name: 'The Combined Path',
    description: 'The queen can change direction between moves. Use both of her powers!',
    hint: 'Try going diagonal first, then straight — or straight then diagonal. Two moves!',
    pieceType: 'queen',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 3 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    starThresholds: { three: 2, two: 4 },
  },

  {
    // Q5 — The First Barrier 5×5
    // Fences block straight up through cols 1-3 of row 2.
    // Optimal: (4,2)→(2,4) diagonal, then (2,4)→(0,2) diagonal. 2 moves.
    name: 'The First Barrier',
    description: "The guards block the straight road. The queen must find a way around!",
    hint: 'The fences block going straight. But the queen can cut through the corners!',
    pieceType: 'queen',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    obstacles: {
      fences: [
        { row: 2, col: 1, side: 'top' },
        { row: 2, col: 2, side: 'top' },
        { row: 2, col: 3, side: 'top' },
      ],
      rivers: [], bridges: [], food: [],
    },
    starThresholds: { three: 2, two: 4 },
  },

  {
    // Q6 — River and Ridge 5×5
    // River spans row 2 cols 1-4; bridge only at col 0.
    // Optimal: (4,0)→(0,0) straight up (passes through bridge), then (0,0)→(0,3) right. 2 moves.
    name: 'River and Ridge',
    description: 'A river cuts across the realm. One bridge still stands — find it!',
    hint: 'The bridge is on the left. Slide through it, then cut right to the goal.',
    pieceType: 'queen',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 3 },
    obstacles: {
      fences: [],
      rivers: [
        { row: 2, col: 1 }, { row: 2, col: 2 },
        { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
      bridges: [{ row: 2, col: 0 }],
      food: [],
    },
    starThresholds: { three: 2, two: 4 },
  },

  {
    // Q7 — The Watchers 5×5  ← introduces watchedSquares
    // Center 3×3 (rows 1-3, cols 1-3) is watched — queen cannot enter.
    // Optimal: (4,4)→(0,4) straight up, then (0,4)→(0,0) straight left. 2 moves via edges.
    // Direct diagonal (4,4)→(0,0) is blocked by watched squares at (3,3),(2,2),(1,1).
    name: 'The Watchers',
    description: "The Queen's own guards have turned. They patrol the center — and she can't enter!",
    hint: 'Those red squares are guarded. Go around the edges — up the side, then across.',
    pieceType: 'queen',
    start: { row: 4, col: 4 },
    goal:  { row: 0, col: 0 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    guardPieces: [{ pieceType: 'king', position: { row: 2, col: 2 } }],
    starThresholds: { three: 2, two: 4 },
  },
];

// ─── Duo finale levels (Q8–Q9) ───────────────────────────────────────────────

export const queenFinale: DuoLevel[] = [
  {
    // Q8 — The Approach 5×5 (knight + king)
    // Watched squares cover cols 0-3 in rows 1-3 — king must use col 4.
    // Knight jumps straight through: (4,0)→(2,1)→(0,2). 2 moves.
    // King walks up col 4: (4,4)→(3,4)→(2,4)→(1,4)→(0,4). 4 moves.
    // Optimal total: 6 moves.
    name: 'The Approach',
    description: "The watchers guard the whole palace. Only the knight can reach the throne!",
    hint: "The knight jumps right over the red squares! The king must use the far side.",
    pieces: [
      { pieceType: 'knight', start: { row: 4, col: 0 }, goal: { row: 0, col: 2 } },
      { pieceType: 'king',   start: { row: 4, col: 4 }, goal: { row: 0, col: 4 } },
    ],
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    watchedSquares: [
      { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
    ],
    starThresholds: { three: 6, two: 9 },
  },

  {
    // Q9 — The Proof [↕ scroll] 11-row (knight + king)
    // Watched squares: cols 1-3 in rows 1-9. King must stay in col 0 or 4.
    //
    // Knight path (5 jumps from row 10 to row 0 via col 1-2 zigzag):
    //   (10,1)→(8,2)→(6,1)→(4,2)→(2,1)→(0,2)  all land on watched cols but knight ignores.
    // King path (col 4, rows 10→4):
    //   (10,4)→(9,4)→(8,4)→(7,4)→(6,4)→(5,4)→(4,4)  6 steps
    // Optimal total: 5 + 6 = 11 moves.
    name: 'The Proof',
    description: 'The knight leaps through the heart of the realm. The king follows the one clear path.',
    hint: "The knight ignores every red square — it just jumps! The king must stay in the far lane.",
    pieces: [
      { pieceType: 'knight', start: { row: 10, col: 1 }, goal: { row: 0, col: 2 } },
      { pieceType: 'king',   start: { row: 10, col: 4 }, goal: { row: 4,  col: 4 } },
    ],
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    watchedSquares: [
      ...Array.from({ length: 9 }, (_, i) => ({ row: i + 1, col: 1 })),
      ...Array.from({ length: 9 }, (_, i) => ({ row: i + 1, col: 2 })),
      ...Array.from({ length: 9 }, (_, i) => ({ row: i + 1, col: 3 })),
    ],
    boardHeight: 11, boardWidth: 5, scrollAxis: 'vertical',
    starThresholds: { three: 11, two: 16 },
  },
];

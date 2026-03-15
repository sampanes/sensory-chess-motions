import { DuoLevel } from '../duoLevelDef';

// ─── The Paired Path — World 5 ────────────────────────────────────────────────
// Teaching arc: two pieces, both must reach their flags. Move count is shared.
// Tap a piece to select it, then tap a destination — in any order.
//
// Cooperative rules (implemented in DuoBoard):
//   • Pieces may *pass through* each other's square (they cooperate — step aside).
//   • Pieces may NOT *land* on each other's square (can't overlap at rest).
//
// Optimal move counts assume optimal sequencing (no wasted moves):
//   P1  5 moves  — King 2 + Pawn 3
//   P2  6 moves  — Rook 1 + Knight 5   [↔ scroll, 11-col]
//   P3  3 moves  — Bishop 2 + Pawn 1
//   P4  4 moves  — Knight 2 + Rook 2
//   P5  6 moves  — Knight 2 + King 4

export const duoLevels: DuoLevel[] = [
  {
    // P1 — introduce the concept: two pieces, each has a flag
    // King: (4,0) → (2,2) via 2 diagonal steps
    // Pawn: (4,4) → (0,4) via 2-step from back rank + 2 forward steps
    //   (4,4)→(2,4) [back-rank 2-step], (2,4)→(1,4), (1,4)→(0,4)
    // Optimal total: 2 + 3 = 5 moves
    name: 'Pair of Friends',
    description: 'Two pieces, two flags. Help them both get home!',
    hint: 'Tap a piece to select it, then tap where to move. You can switch between pieces any time!',
    pieces: [
      { pieceType: 'king',  start: { row: 4, col: 0 }, goal: { row: 2, col: 2 } },
      { pieceType: 'pawn',  start: { row: 4, col: 4 }, goal: { row: 0, col: 4 } },
    ],
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    starThresholds: { three: 5, two: 7 },
  },

  {
    // P3 — Bishop + Pawn: different movement styles, each finds its own path
    // Bishop: (4,0) → (0,4) — slides diagonal, stops to eat food at (2,2), then continues
    //   (4,0)→(2,2)[food], (2,2)→(0,4): 2 moves
    // Pawn: (4,4) → (2,4) — back-rank 2-step: 1 move
    // Optimal total: 2 + 1 = 3 moves
    name: 'Diagonals Together',
    description: 'The bishop sweeps across; the pawn leaps forward. Different moves, same goal!',
    hint: 'The bishop slides diagonally — but the apple stops it halfway. Then it can continue!',
    pieces: [
      { pieceType: 'bishop', start: { row: 4, col: 0 }, goal: { row: 0, col: 4 } },
      { pieceType: 'pawn',   start: { row: 4, col: 4 }, goal: { row: 2, col: 4 } },
    ],
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 2, col: 2 },  // sits on bishop's diagonal — stops mid-slide, bishop eats it
      ],
    },
    starThresholds: { three: 3, two: 5 },
  },

  {
    // P4 — Knight + Rook: same fence maze, completely different solutions
    // Fence wall across row 2 (cols 0-3), gap at col 4.
    //
    // Rook: (4,0) → (0,4)
    //   Must go around the fence: (4,0)→(4,4)[right], (4,4)→(0,4)[up through gap]. 2 moves.
    //
    // Knight: (4,2) → (0,2)
    //   Ignores the fence entirely:  (4,2)→(2,1), (2,1)→(0,2). 2 moves.
    //
    // Optimal total: 4 moves
    name: 'The Formation',
    description: 'The fence stops the rook cold. The knight doesn\'t even notice it!',
    hint: 'The rook must go around the gap in the fence. The knight just jumps right over!',
    pieces: [
      { pieceType: 'rook',   start: { row: 4, col: 0 }, goal: { row: 0, col: 4 } },
      { pieceType: 'knight', start: { row: 4, col: 2 }, goal: { row: 0, col: 2 } },
    ],
    obstacles: {
      fences: [
        // Wall across row 2 top at cols 0-3 — blocks rook/king upward; gap at col 4
        { row: 2, col: 0, side: 'top' }, { row: 2, col: 1, side: 'top' },
        { row: 2, col: 2, side: 'top' }, { row: 2, col: 3, side: 'top' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
    starThresholds: { three: 4, two: 6 },
  },

  {
    // P5 — King + Knight: fence double-wall with gap at col 4 only
    // King: (4,4) → (0,4) — must use the gap, threading 4 steps straight up
    //   (4,4)→(3,4)→(2,4)→(1,4)→(0,4). 4 moves.
    // Knight: (4,0) → (0,0) — ignores both fence walls completely
    //   (4,0)→(2,1), (2,1)→(0,0). 2 moves.
    // Optimal total: 6 moves
    name: 'Royal Escort',
    description: 'The king must find the narrow gap. The knight flies straight through the walls!',
    hint: 'Only one path leads the king through. The knight doesn\'t need a path — it leaps!',
    pieces: [
      { pieceType: 'king',   start: { row: 4, col: 4 }, goal: { row: 0, col: 4 } },
      { pieceType: 'knight', start: { row: 4, col: 0 }, goal: { row: 0, col: 0 } },
    ],
    obstacles: {
      fences: [
        // Wall 1: row 3 top, cols 0-3 — gap at col 4
        { row: 3, col: 0, side: 'top' }, { row: 3, col: 1, side: 'top' },
        { row: 3, col: 2, side: 'top' }, { row: 3, col: 3, side: 'top' },
        // Wall 2: row 1 top, cols 0-3 — gap at col 4
        { row: 1, col: 0, side: 'top' }, { row: 1, col: 1, side: 'top' },
        { row: 1, col: 2, side: 'top' }, { row: 1, col: 3, side: 'top' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
    starThresholds: { three: 6, two: 8 },
  },

  {
    // P2 — [↔ scroll] 11-col "Road and Ridge": rook slides the bottom lane in 1 move;
    // knight hops the top ridge in 5 jumps. Both start on the left, finish on the right.
    //
    // Rivers in rows 2-3 (cols 1-9) create a clear visual "divider" between the two lanes,
    // preventing either piece from straying into the other's territory.
    //
    // Rook:   (4,0) → (4,10) — straight slide along the bottom.  1 move.
    // Knight: (0,0) → (1,10) — hop across the top:
    //   (0,0)→(1,2)  (+1,+2) ✓
    //   (1,2)→(0,4)  (-1,+2) ✓
    //   (0,4)→(1,6)  (+1,+2) ✓
    //   (1,6)→(0,8)  (-1,+2) ✓
    //   (0,8)→(1,10) (+1,+2) ✓  goal!
    // Optimal total: 1 + 5 = 6 moves
    name: 'Road and Ridge',
    description: 'The rook takes the road. The knight takes the ridge. Same world — completely different journeys!',
    hint: 'The rook can slide all the way in one move! Then help the knight hop across the top.',
    pieces: [
      { pieceType: 'rook',   start: { row: 4, col: 0 }, goal: { row: 4, col: 10 } },
      { pieceType: 'knight', start: { row: 0, col: 0 }, goal: { row: 1, col: 10 } },
    ],
    obstacles: {
      fences: [],
      // Rivers in rows 2-3 (cols 1-9) divide the board into top and bottom lanes.
      // Knight lands only in rows 0-1; rook travels row 4. Neither crosses the river divide.
      rivers: [
        ...Array.from({ length: 9 }, (_, i) => ({ row: 2, col: i + 1 })),
        ...Array.from({ length: 9 }, (_, i) => ({ row: 3, col: i + 1 })),
      ],
      bridges: [],
      food: [],
    },
    boardHeight: 5,
    boardWidth: 11,
    scrollAxis: 'horizontal',
    starThresholds: { three: 6, two: 8 },
  },
];

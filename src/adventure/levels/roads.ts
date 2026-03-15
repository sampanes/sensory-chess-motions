import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Rook's Roads — World 2 ───────────────────────────────────────────────────
// Teaching arc:
//   R1  straight slide — rook crosses in one move
//   R2  [↔ scroll] open 11-col corridor — infinite-range "wow" moment
//   R3  river blocking direct path — must find the bridge
//   R4  fence wall across most of the board — one gap, must go around
//   R5  two rivers, staggered bridges — zigzag crossing
//   R6  double fence walls — snake through two gaps (5-move maze)
//   R7  river moat around goal — find the gap and slide in
//   R8  [↕ scroll] 11-row vertical road — rivers + fence wall combined

export const rookLevels: Level[] = [
  {
    // R1 — pure intro: rook slides the full row in one move
    name: 'The Long Road',
    description: 'The road stretches out ahead. One long push and you are there!',
    hint: 'The rook slides as far as it wants — all the way to the wall!',
    pieceType: 'rook',
    start: { row: 2, col: 0 },
    goal:  { row: 2, col: 4 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // R2 — [↔ scroll] open 11-column corridor: the rook fires all the way across
  // Optimal: 1 move — slide right from col 0 to col 10.
  compileScrollLevel({
    name: 'The Corridor',
    description: 'The road goes on and on… and the rook never has to stop!',
    hint: 'Just go right — all the way! The rook can slide as far as the board allows.',
    pieceType: 'rook',
    axis: 'horizontal',
    starThresholds: { three: 1, two: 2 },
    strips: [
      // strips[i] = col i; each strip = [row0, row1, row2, row3, row4]
      [0,   0,   'S', 0,   0  ],   // col 0  — start at row 2
      [0,   0,   0,   0,   0  ],   // col 1
      [0,   0,   0,   0,   0  ],   // col 2
      [0,   0,   0,   0,   0  ],   // col 3
      [0,   0,   0,   0,   0  ],   // col 4
      [0,   0,   0,   0,   0  ],   // col 5
      [0,   0,   0,   0,   0  ],   // col 6
      [0,   0,   0,   0,   0  ],   // col 7
      [0,   0,   0,   0,   0  ],   // col 8
      [0,   0,   0,   0,   0  ],   // col 9
      [0,   0,   'G', 0,   0  ],   // col 10 — goal at row 2
    ],
  }),

  {
    // R3 — full river across row 2, bridge at col 3; must detour right then back left
    // Path: (4,1)→(4,3) right, (4,3)→(0,3) up through bridge, (0,3)→(0,1) left. 3 moves.
    name: 'Bridge Builder',
    description: 'A wide river blocks the way. Only one bridge will get you across.',
    hint: 'Find the bridge — then shoot straight through it!',
    pieceType: 'rook',
    start: { row: 4, col: 1 },
    goal:  { row: 0, col: 1 },
    starThresholds: { three: 3, two: 4 },
    obstacles: {
      fences: [],
      rivers: [
        { row: 2, col: 0 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },  // bridge here
        { row: 2, col: 4 },
      ],
      bridges: [{ row: 2, col: 3 }],
      food: [],
    },
  },

  {
    // R4 — fence wall blocks upward movement across cols 0-3; gap at col 4
    // Path: (4,0)→(4,4) right, (4,4)→(0,4) up through gap, (0,4)→(0,0) left. 3 moves.
    name: 'Around the Wall',
    description: 'A great fence runs almost the whole way across. Almost.',
    hint: 'The fence has a gap — find it and shoot through!',
    pieceType: 'rook',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 0 },
    starThresholds: { three: 3, two: 4 },
    obstacles: {
      fences: [
        { row: 2, col: 0, side: 'top' },  // blocks upward from (2,0) to (1,0)
        { row: 2, col: 1, side: 'top' },
        { row: 2, col: 2, side: 'top' },
        { row: 2, col: 3, side: 'top' },
        // col 4 left open — the gap
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
  },

  {
    // R5 — two full-width rivers, bridges on opposite sides; zigzag required
    // River row 3: bridge at col 4. River row 1: bridge at col 0.
    // Path: (4,4)→(2,4) [through bridge (3,4)], (2,4)→(2,0) left, (2,0)→(0,0) [through bridge (1,0)]. 3 moves.
    name: 'Two Rivers',
    description: 'Two rivers, two bridges — but they are not on the same side!',
    hint: 'Cross the first river on the right, then cross the second river on the left.',
    pieceType: 'rook',
    start: { row: 4, col: 4 },
    goal:  { row: 0, col: 0 },
    starThresholds: { three: 3, two: 4 },
    obstacles: {
      fences: [],
      rivers: [
        { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 },
        { row: 3, col: 3 }, { row: 3, col: 4 },  // bridge at col 4
        { row: 1, col: 0 },  // bridge at col 0
        { row: 1, col: 1 }, { row: 1, col: 2 },
        { row: 1, col: 3 }, { row: 1, col: 4 },
      ],
      bridges: [
        { row: 3, col: 4 },
        { row: 1, col: 0 },
      ],
      food: [],
    },
  },

  {
    // R6 — double fence walls, each with a gap on opposite sides
    // Wall 1 (row 3 top, cols 1-4): gap at col 0 going upward past row 3
    // Wall 2 (row 1 top, cols 0-3): gap at col 4 going upward past row 1
    // Optimal path (5 moves): (4,2)→(4,0) left, (4,0)→(1,0) up [stops at wall 2],
    //   (1,0)→(1,4) right, (1,4)→(0,4) up through gap, (0,4)→(0,2) left.
    name: 'The Courtyard',
    description: 'The courtyard has two gates — one on the left, one on the right.',
    hint: 'Use the left gap to get partway, then find the right gap to finish!',
    pieceType: 'rook',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 5, two: 7 },
    obstacles: {
      fences: [
        // Wall 1: blocks upward from row 3 to row 2 at cols 1–4 (gap at col 0)
        { row: 3, col: 1, side: 'top' },
        { row: 3, col: 2, side: 'top' },
        { row: 3, col: 3, side: 'top' },
        { row: 3, col: 4, side: 'top' },
        // Wall 2: blocks upward from row 1 to row 0 at cols 0–3 (gap at col 4)
        { row: 1, col: 0, side: 'top' },
        { row: 1, col: 1, side: 'top' },
        { row: 1, col: 2, side: 'top' },
        { row: 1, col: 3, side: 'top' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
  },

  {
    // R7 — river moat surrounds the goal; bridge on the right side; stop via river above col 4
    // Moat rivers: ring around (2,2) + (1,4) as upper blocker
    // Bridge at (2,3) — right gap in the ring
    // Path: (4,2)→(4,4) right, (4,4)→(2,4) up [stops at river (1,4)],
    //   (2,4)→(2,2) left [passes bridge (2,3), lands on goal]. 3 moves.
    name: 'The Moat',
    description: 'The flag hides inside a moat! Find the gap and slide right in.',
    hint: 'Go around the moat, then slide in through the one opening.',
    pieceType: 'rook',
    start: { row: 4, col: 2 },
    goal:  { row: 2, col: 2 },
    starThresholds: { three: 3, two: 4 },
    obstacles: {
      fences: [],
      rivers: [
        // Ring around (2,2)
        { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
        { row: 2, col: 1 },                      { row: 2, col: 3 },  // bridge at (2,3)
        { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
        // Upper blocker so rook stops at (2,4) when approaching from below
        { row: 1, col: 4 },
      ],
      bridges: [{ row: 2, col: 3 }],
      food: [],
    },
  },

  // R8 — [↕ scroll] 11-row vertical road with two rivers and a fence wall
  // River row 7: bridge at col 4 (right side).
  // Fence wall row 5: blocks upward at cols 1–4 (gap at col 0).
  // River row 2: bridge at col 0 (left side).
  // Optimal path (5 moves):
  //   (10,2)→(10,4) right
  //   (10,4)→(5,4) up [through bridge (7,4), stops at fence]
  //   (5,4)→(5,0) left
  //   (5,0)→(0,0) up [through bridge (2,0)]
  //   (0,0)→(0,2) right
  compileScrollLevel({
    name: "Road's End",
    description: 'The longest road in the kingdom. Two rivers, one great wall — find the way through.',
    hint: 'Cross the first river on the right, slip past the wall on the left, then cross the second river.',
    pieceType: 'rook',
    axis: 'vertical',
    starThresholds: { three: 5, two: 7 },
    strips: [
      // strips[i] = row i; each strip = [col0, col1, col2, col3, col4]
      [0,   0,   'G', 0,   0  ],              // row 0  — goal at col 2
      [0,   0,   0,   0,   0  ],              // row 1  — open
      ['B', 'R', 'R', 'R', 'R'],             // row 2  — river, bridge at col 0
      [0,   0,   0,   0,   0  ],              // row 3  — open
      [0,   0,   0,   0,   0  ],              // row 4  — open
      [0, {fT:true}, {fT:true}, {fT:true}, {fT:true}], // row 5  — fence wall cols 1–4, gap at col 0
      [0,   0,   0,   0,   0  ],              // row 6  — open
      ['R', 'R', 'R', 'R', 'B'],             // row 7  — river, bridge at col 4
      [0,   0,   0,   0,   0  ],              // row 8  — open
      [0,   0,   0,   0,   0  ],              // row 9  — open
      [0,   0,   'S', 0,   0  ],              // row 10 — start at col 2
    ],
  }),
];

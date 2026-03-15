import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Pawn's Farm — World 1 ────────────────────────────────────────────────────
// Teaching arc:
//   F1  forward 1 step
//   F2  2-step jump from back rank
//   F3  food blocks forward path → eat diagonal to detour
//   F4  deliberate diagonal eating to reach a shifted goal
//   F5  fence blocks + diagonal eating chain
//   F6  two food options; player chooses path
//   F7  chained eats: straight path blocked, must zigzag via food
//   F8  scrolling world: long march up the whole field

export const farmLevels: Level[] = [
  {
    // F1 — pure intro: one step forward
    name: 'Planting Time',
    description: 'The pawn takes its very first step into the field.',
    hint: 'The pawn marches forward — one square at a time!',
    pieceType: 'pawn',
    start: { row: 4, col: 2 },
    goal:  { row: 3, col: 2 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  {
    // F2 — teach the 2-step jump from the back rank
    name: 'First Furrow',
    description: 'From the very back of the field, the pawn can leap two squares!',
    hint: 'Pawns can jump two squares forward on their very first move!',
    pieceType: 'pawn',
    start: { row: 4, col: 2 },
    goal:  { row: 2, col: 2 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  {
    // F3 — food blocks the straight path; must eat the diagonal apple to progress
    // Path: food at (3,1) blocks forward. Eat right→(3,2), forward(2,2), eat right→(1,3), forward(0,3). 4 moves.
    name: 'The Apple Tree',
    description: 'An apple has fallen right in the path! Find another way forward.',
    hint: 'The pawn can eat an apple that is one step diagonally ahead of it!',
    pieceType: 'pawn',
    start: { row: 4, col: 1 },
    goal:  { row: 0, col: 3 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 3, col: 1 },  // blocks forward from (4,1)
        { row: 3, col: 2 },  // diagonal-right eat from (4,1) → pawn moves to (3,2)
        { row: 1, col: 3 },  // diagonal-right eat from (2,2) → pawn moves to (1,3)
      ],
    },
  },

  {
    // F4 — deliberate diagonal eating to reach a goal in a different column
    // Path: eat right→(3,1), forward(2,1), eat right→(1,2), forward(0,2). 4 moves.
    name: 'Side Harvest',
    description: 'The best apples grow a little to the side — you have to reach for them!',
    hint: 'Eat the apple diagonally to shift your path toward the flag!',
    pieceType: 'pawn',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 4, two: 5 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 3, col: 1 },  // diagonal-right eat from (4,0) → (3,1)
        { row: 1, col: 2 },  // diagonal-right eat from (2,1) → (1,2)
      ],
    },
  },

  {
    // F5 — fence blocks forward; chained diagonal eats are the only route
    // Path: forward(3,1)[fence top here blocks further], eat right→(2,2)[fence top blocks],
    //       eat right→(1,3), forward(0,3). 4 moves.
    // Fence at (3,1,'top') blocks (3,1)→(2,1) and also 2-step through row 3.
    // Fence at (2,2,'top') blocks (2,2)→(1,2).
    name: 'The Fence Row',
    description: 'An old fence runs across the field — but there is a way around it!',
    hint: 'Look for apples diagonally — eating them can help you bypass the fence!',
    pieceType: 'pawn',
    start: { row: 4, col: 1 },
    goal:  { row: 0, col: 3 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [
        { row: 3, col: 1, side: 'top' },  // blocks (3,1)→(2,1) forward
        { row: 2, col: 2, side: 'top' },  // blocks (2,2)→(1,2) forward
      ],
      rivers: [],
      bridges: [],
      food: [
        { row: 2, col: 2 },  // diagonal-right eat from (3,1) → (2,2)
        { row: 1, col: 3 },  // diagonal-right eat from (2,2) → (1,3)
      ],
    },
  },

  {
    // F6 — two apple options; only one path leads to the goal
    // Right path (optimal): eat right→(3,3), forward(2,3), eat right→(1,4), forward(0,4). 4 moves.
    // Left distractor: eat left→(3,1) → can't reach (0,4) efficiently.
    name: 'Field Crossing',
    description: 'The field is full of apples! There is more than one way — but only one way forward.',
    hint: 'Try each path and see which one leads to the flag!',
    pieceType: 'pawn',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 3, col: 3 },  // diagonal-right eat from (4,2) → (3,3)
        { row: 1, col: 4 },  // diagonal-right eat from (2,3) → (1,4)
        { row: 3, col: 1 },  // distractor: eating left leads away from goal
      ],
    },
  },

  {
    // F7 — straight path blocked by food; must zigzag via diagonal eats
    // Forward from (4,0) blocked by food at (3,0). Must eat right→(3,1), forward(2,1),
    // eat right→(1,2), forward(0,2). 4 moves.
    name: 'Harvest Festival',
    description: 'Apple after apple — keep eating and the path opens up!',
    hint: 'The apple right ahead is blocking you — look diagonally instead!',
    pieceType: 'pawn',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 3, col: 0 },  // blocks forward from (4,0)
        { row: 3, col: 1 },  // diagonal-right eat from (4,0) → (3,1)
        { row: 1, col: 2 },  // diagonal-right eat from (2,1) → (1,2)
      ],
    },
  },

  // F8 — scrolling vertical world: long farm march with 2-step bonus
  // Optimal: 2-step (8,2)→(6,2), then forward ×6 = 7 moves.
  compileScrollLevel({
    name: 'The Long Field',
    description: 'The harvest stretches all the way to the horizon. March on!',
    hint: 'Remember — from the very start you can leap two squares forward!',
    pieceType: 'pawn',
    axis: 'vertical',
    starThresholds: { three: 7, two: 9 },
    strips: [
      // strips[0] = row 0 (top — goal side)
      [0,   0,   'G', 0,   0  ],              // row 0 — goal at col 2
      [0,   0,   0,   0,   0  ],              // row 1
      [0,   0,   0,   0,   0  ],              // row 2
      [0,   { fR: true }, 0,  0,   0  ],      // row 3 — decorative fence post
      [0,   0,   0,   0,   0  ],              // row 4
      ['F', 0,   0,   0,   0  ],              // row 5 — apple off to the side
      [0,   0,   0,   0,   0  ],              // row 6
      [0,   0,   0,   { fL: true }, 0],       // row 7 — decorative fence
      [0,   0,   'S', 0,   0  ],              // row 8 — start at col 2 (back rank)
    ],
  }),
];

import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Act 1 fixed 5×5 levels ──────────────────────────────────────────────────

export const act1KingLevels: Level[] = [
  {
    // A1 — pure intro: one step
    name: 'A Small Beginning',
    description: 'The king takes his very first step.',
    hint: 'The king moves one square in any direction — up, down, sideways, or diagonal!',
    pieceType: 'king',
    start: { row: 4, col: 2 },
    goal: { row: 3, col: 2 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },
  {
    // A2 — teach the diagonal: 2-step shortcut
    name: 'The First Step',
    description: 'The flag is off to the side. Move diagonally to reach it faster!',
    hint: 'Two diagonal steps is faster than going straight then sideways.',
    pieceType: 'king',
    start: { row: 4, col: 0 },
    goal: { row: 2, col: 2 },
    starThresholds: { three: 2, two: 3 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // A3 — scrolling vertical world: 9 rows deep, king walks from bottom to top
  compileScrollLevel({
    name: 'Around the Corner',
    description: 'From one end of the kingdom to the other — the world opens up as you walk!',
    hint: 'Diagonal moves get you far faster. Head straight for the distant flag.',
    pieceType: 'king',
    axis: 'vertical',
    starThresholds: { three: 8, two: 10 },
    strips: [
      // strips[0] = row 0 (top of world — goal side)
      ['G', 0,   0,   0,   0  ],   // row 0
      [0,   0,   0,   0,   0  ],   // row 1
      [0,   0,   0,   0,   0  ],   // row 2 — open meadow
      [0,   0,   { fL: true }, 0, 0], // row 3 — decorative fence post
      [0,   0,   0,   0,   0  ],   // row 4
      [0,   0,   0,   0,   0  ],   // row 5 — open meadow
      [0,   0,   0,   { fR: true }, 0], // row 6 — another fence post
      [0,   0,   0,   0,   0  ],   // row 7
      [0,   0,   0,   0,   'S'],   // row 8 (bottom of world — start)
    ],
  }),

  {
    // A4 — multiple routes, decorative fence, corner-to-corner diag: 4 steps
    name: 'The Meadow Path',
    description: 'The meadow has many paths. Which one is shortest?',
    hint: 'There are lots of routes — but one diagonal line gets there fastest!',
    pieceType: 'king',
    start: { row: 4, col: 0 },
    goal: { row: 0, col: 4 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [
        { row: 2, col: 1, side: 'top' },
        { row: 1, col: 3, side: 'bottom' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
  },
  {
    // A5 — two fence walls with a gap at col 2; optimal straight-through = 4 steps
    name: 'A Narrow Gap',
    description: 'Two old walls stand in your way. Find the opening and slip through!',
    hint: 'Look carefully — there is a way through each wall.',
    pieceType: 'king',
    start: { row: 4, col: 2 },
    goal: { row: 0, col: 2 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [
        // Wall 1 at top of row 3 — gap at col 2
        { row: 3, col: 0, side: 'top' },
        { row: 3, col: 1, side: 'top' },
        { row: 3, col: 3, side: 'top' },
        { row: 3, col: 4, side: 'top' },
        // Wall 2 at top of row 1 — gap at col 2
        { row: 1, col: 0, side: 'top' },
        { row: 1, col: 1, side: 'top' },
        { row: 1, col: 3, side: 'top' },
        { row: 1, col: 4, side: 'top' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
  },

  // A6 — scrolling horizontal world: wide meadow, king moves right
  compileScrollLevel({
    name: 'The Wide Meadow',
    description: 'The meadow stretches as far as you can see. Walk toward the sunrise!',
    hint: 'The king can move diagonally — you don\'t have to go straight across!',
    pieceType: 'king',
    axis: 'horizontal',
    starThresholds: { three: 7, two: 9 },
    strips: [
      // strips[i] = col i  (each strip is [row0, row1, row2, row3, row4])
      ['S', 0,   0,   0,   0  ],   // col 0 — start at top-left
      [0,   0,   0,   0,   0  ],   // col 1
      [0,   0,   0,   0,   0  ],   // col 2
      [0,   0,   { fT: true }, 0, 0], // col 3 — decorative fence on a cell
      [0,   0,   0,   0,   0  ],   // col 4
      [0,   0,   0,   0,   0  ],   // col 5
      [0,   0,   0,   { fB: true }, 0], // col 6 — another fence
      [0,   0,   0,   0,   0  ],   // col 7
      [0,   0,   0,   0,   'G'],   // col 8 — goal at bottom-right
    ],
  }),
];

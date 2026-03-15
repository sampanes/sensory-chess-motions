import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Bishop's Grove — World 3 ─────────────────────────────────────────────────
// Teaching arc:
//   B1  corner-to-corner sweep — the pure diagonal intro
//   B2  same-column goal — must use two diagonal hops
//   B3  food stops the slide mid-diagonal — natural two-step path
//   B4  river blocks the right lane — forced to use the left diagonal
//   B5  river in the centre — bend around it in 3 moves
//   B6  same river, corner-to-corner goal — 4-move winding path
//   B7  food sits exactly on the main diagonal — delight/rest level
//   B8  [↕ scroll] long grove with 4 rivers — 5-move forced zigzag
//
// NOTE: isFenceBlocking() only handles cardinal directions (dr=0 or dc=0).
// Diagonal bishop movement always returns false from that check, so fences
// do NOT block bishops. Use rivers as the only obstacle type here.

export const bishopLevels: Level[] = [
  {
    // B1 — pure intro: bishop sweeps the full diagonal in one move
    name: 'Into the Grove',
    description: 'A sunlit path cuts across the grove. One long step and you are there!',
    hint: 'The bishop glides diagonally — all the way to the far corner!',
    pieceType: 'bishop',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  {
    // B2 — goal directly above start: no single diagonal reaches it
    // Paths: (4,2)→(2,4)→(0,2) or (4,2)→(2,0)→(0,2). 2 moves.
    name: 'Two Hops',
    description: 'The flag is straight ahead — but the bishop cannot go straight!',
    hint: 'Go diagonally one way, then come back diagonally the other way.',
    pieceType: 'bishop',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 2, two: 3 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  {
    // B3 — food stops the bishop mid-diagonal, creating a natural two-step path
    // Direct (4,0)→(0,4) passes through (2,2). Food at (2,2) stops the slide.
    // Path: (4,0)→(2,2)[eat], (2,2)→(0,4). 2 moves.
    name: 'Apple Stop',
    description: 'An apple sits right in the middle of the diagonal. It will stop you — then send you on your way!',
    hint: 'Slide toward the apple, eat it, then continue your diagonal!',
    pieceType: 'bishop',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [{ row: 2, col: 2 }],
    },
  },

  {
    // B4 — river blocks the right-hand lane; forced to use the left diagonal
    // River at (2,4) stops (4,2)→(2,4). Forced: (4,2)→(2,0)→(0,2). 2 moves.
    name: 'Blocked Lane',
    description: 'One path through the grove is flooded. Find the other way!',
    hint: 'If one diagonal is blocked by a river, try the other direction!',
    pieceType: 'bishop',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [],
      rivers: [{ row: 2, col: 4 }],
      bridges: [],
      food: [],
    },
  },

  {
    // B5 — river at (2,2) blocks the direct NE sweep; must bend around it
    // (4,0)→(3,1) stops before river. (3,1)→(2,0) NW. (2,0)→(0,2) NE 2. 3 moves.
    name: 'The Bend',
    description: 'A river cuts right through the grove! You will have to go the long way around.',
    hint: 'Go up one step, then swing left, then cut back across to reach the flag.',
    pieceType: 'bishop',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 3, two: 4 },
    obstacles: {
      fences: [],
      rivers: [{ row: 2, col: 2 }],
      bridges: [],
      food: [],
    },
  },

  {
    // B6 — same river at (2,2), goal moved to corner — forces a longer 4-move path
    // (4,0)→(3,1)→(2,0)→(1,1)→(0,0). 4 moves.
    name: 'Mossy Trail',
    description: 'The trail through the grove twists and turns — keep your eyes on the flag!',
    hint: 'Each step brings you one bend closer. Watch which way you zigzag!',
    pieceType: 'bishop',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 0 },
    starThresholds: { three: 4, two: 6 },
    obstacles: {
      fences: [],
      rivers: [{ row: 2, col: 2 }],
      bridges: [],
      food: [],
    },
  },

  {
    // B7 — food sits exactly on the main NW diagonal — delight/rest level before finale
    // (4,4)→(2,2)[eat]→(0,0). 2 moves. The food creates the natural pivot.
    name: 'Dew Drop',
    description: 'An apple waits in the heart of the grove — right in the perfect spot!',
    hint: 'Slide diagonally toward the apple. After you eat it, keep going the same way!',
    pieceType: 'bishop',
    start: { row: 4, col: 4 },
    goal:  { row: 0, col: 0 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [{ row: 2, col: 2 }],
    },
  },

  /*
   * ─── compileScrollLevel cell shorthands ──────────────────────────────────
   *  0          empty square
   *  'S'        piece start position
   *  'G'        goal (flag)
   *  'R'        river (impassable)
   *  'B'        bridge (river square that CAN be crossed)
   *  'F'        food / apple
   *  { ... }    CellObj — fences + optional content:
   *               fT / fB / fL / fR : fence on top / bottom / left / right edge
   *               is: 'S'|'G'|'R'|'B'|'F'  — combine fence with content
   *
   *  axis: 'vertical'   → strips[i] = row i,  each strip = [col0, col1, col2, col3, col4]
   *  axis: 'horizontal' → strips[i] = col i,  each strip = [row0, row1, row2, row3, row4]
   *
   *  NOTE: fences do NOT block bishop diagonal moves (isFenceBlocking only checks
   *  cardinal directions). Use rivers as the only obstacle type for bishop worlds.
   *
   *  Future work: Long Level Creator — a visual tool to author strip arrays with
   *  more than 9 rows/cols; documented in PART2_STEPS.md Milestone 16.
   * ─────────────────────────────────────────────────────────────────────────
   */

  // B8 — [↕ scroll] 11-row grove with 4 rivers — 5-move forced zigzag
  // Rivers: (7,1), (6,4), (4,0), (2,4)
  // Optimal path (5 moves):
  //   (10,4)→(8,2)  NW 2  — river (7,1) stops further NW
  //   (8,2)→(7,3)   NE 1  — river (7,1) blocks NW; river (6,4) stops NE at (7,3)
  //   (7,3)→(5,1)   NW 2  — river (6,4) blocks NE; river (4,0) stops NW at (5,1)
  //   (5,1)→(3,3)   NE 2  — river (4,0) blocks NW; river (2,4) stops NE at (3,3)
  //   (3,3)→(0,0)   NW 3  — river (2,4) blocks NE; path NW clear to goal
  compileScrollLevel({
    name: 'The Long Grove',
    description: 'The grove stretches on and on. Four rivers weave across the path — find your way through!',
    hint: 'Zigzag between rivers. When one diagonal is blocked, always try the other!',
    pieceType: 'bishop',
    axis: 'vertical',
    starThresholds: { three: 5, two: 7 },
    strips: [
      // strips[i] = row i; each strip = [col0, col1, col2, col3, col4]
      ['G', 0,   0,   0,   0  ],   // row 0  — goal at col 0
      [0,   0,   0,   0,   0  ],   // row 1  — open
      [0,   0,   0,   0,   'R'],   // row 2  — river at col 4
      [0,   0,   0,   0,   0  ],   // row 3  — open
      ['R', 0,   0,   0,   0  ],   // row 4  — river at col 0
      [0,   0,   0,   0,   0  ],   // row 5  — open
      [0,   0,   0,   0,   'R'],   // row 6  — river at col 4
      [0,   'R', 0,   0,   0  ],   // row 7  — river at col 1
      [0,   0,   0,   0,   0  ],   // row 8  — open
      [0,   0,   0,   0,   0  ],   // row 9  — open
      [0,   0,   0,   0,   'S'],   // row 10 — start at col 4
    ],
  }),
];

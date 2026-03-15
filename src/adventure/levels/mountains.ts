import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Knight's Mountains — World 4 ─────────────────────────────────────────────
// Teaching arc:
//   K1  the L-shape introduced — one clean first jump
//   K2  fence wall in the path — knight flies right over it
//   K3  river blocks the valley — knight hops beside it, not through it
//   K4  dense fence + river maze — only the knight can navigate
//   K5  [↔ scroll] 11-col mountain range — 6-jump zigzag across the peaks
//   K6  full-width river, no bridge — forced 3-jump routing
//   K7  food scattered on landing squares — knight collects mid-flight
//   K8  [↕ scroll] 11-row summit climb — rivers channel a 5-jump zigzag
//
// NOTE: Knights JUMP — they completely ignore fences and rivers during travel.
// The only restriction is that a knight cannot *land* on a river cell
// (unless that cell also has a bridge).

export const knightLevels: Level[] = [
  {
    // K1 — pure intro: one L-shaped jump
    // From (4,2) the knight lights up (2,1), (2,3), (3,0), (3,4) — show all four options.
    // Goal at (2,3): exactly one move, teaches the basic L-shape.
    name: 'The First Jump',
    description: 'The knight springs into the air! One leap — and it lands far away.',
    hint: 'The knight moves in an L-shape: two squares one way, one square sideways!',
    pieceType: 'knight',
    start: { row: 4, col: 2 },
    goal:  { row: 2, col: 3 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  {
    // K2 — fence wall completely blocks upward movement for every other piece.
    // The knight ignores it entirely.
    // Full fence wall at row 2 top (cols 0–4) and row 1 top (cols 0–4).
    // Path: (4,2)→(2,1)→(0,0). 2 moves.
    name: 'Over the Wall',
    description: 'A great stone wall runs across the mountain. The knight flies clean over it!',
    hint: 'Fences stop every other piece — but the knight jumps right over them!',
    pieceType: 'knight',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 0 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [
        // Wall 1: blocks upward slide through row 2 at all cols
        { row: 2, col: 0, side: 'top' }, { row: 2, col: 1, side: 'top' },
        { row: 2, col: 2, side: 'top' }, { row: 2, col: 3, side: 'top' },
        { row: 2, col: 4, side: 'top' },
        // Wall 2: blocks upward slide through row 1 at all cols
        { row: 1, col: 0, side: 'top' }, { row: 1, col: 1, side: 'top' },
        { row: 1, col: 2, side: 'top' }, { row: 1, col: 3, side: 'top' },
        { row: 1, col: 4, side: 'top' },
      ],
      rivers: [],
      bridges: [],
      food: [],
    },
  },

  {
    // K3 — river sits exactly on the rook/pawn's straight-up path through col 2.
    // The knight naturally hops to the side — it never has to touch the river.
    // Path: (4,2)→(2,1)→(0,2)  or  (4,2)→(2,3)→(0,2). 2 moves.
    name: 'Mountain Stream',
    description: 'A torrent floods the valley floor! Other pieces must find a bridge — the knight does not.',
    hint: 'The knight jumps right past the river — it never has to touch the water!',
    pieceType: 'knight',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [],
      rivers: [{ row: 2, col: 2 }],  // blocks the straight-up path through col 2
      bridges: [],
      food: [],
    },
  },

  {
    // K4 — dense fence + river maze: every other piece is fully trapped.
    // Double fence walls at rows 2 and 1 (all cols). Rivers at (3,1) and (3,3) narrow
    // the row-3 landing corridor for a stepping piece.
    // The knight ignores all fences and hops over the flanking rivers cleanly.
    // Path: (4,2)→(2,3)→(0,4). 2 moves.
    name: 'The Shortcut',
    description: 'Fences, rivers, walls — nothing can stop the knight from finding a way through!',
    hint: 'Other pieces are completely blocked here. The knight leaps straight through everything!',
    pieceType: 'knight',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 2, two: 3 },
    obstacles: {
      fences: [
        // Double wall — completely impassable for rook / bishop / pawn / king going up
        { row: 2, col: 0, side: 'top' }, { row: 2, col: 1, side: 'top' },
        { row: 2, col: 2, side: 'top' }, { row: 2, col: 3, side: 'top' },
        { row: 2, col: 4, side: 'top' },
        { row: 1, col: 0, side: 'top' }, { row: 1, col: 1, side: 'top' },
        { row: 1, col: 2, side: 'top' }, { row: 1, col: 3, side: 'top' },
        { row: 1, col: 4, side: 'top' },
      ],
      rivers: [
        { row: 3, col: 1 },  // flanking river — narrows the row-3 corridor for steppers
        { row: 3, col: 3 },
      ],
      bridges: [],
      food: [],
    },
  },

  /*
   * ─── compileScrollLevel cell shorthands ──────────────────────────────────
   *  0          empty square
   *  'S'        piece start position
   *  'G'        goal (flag)
   *  'R'        river (impassable for landing; knight travels over freely)
   *  'B'        bridge (river square the knight CAN land on)
   *  'F'        food / apple (collected by landing on it — does not block the knight)
   *  { ... }    CellObj — fences + optional content:
   *               fT / fB / fL / fR : fence on top / bottom / left / right edge
   *               is: 'S'|'G'|'R'|'B'|'F'  — combine fence with content
   *
   *  axis: 'vertical'   → strips[i] = row i,  each strip = [col0, col1, col2, col3, col4]
   *  axis: 'horizontal' → strips[i] = col i,  each strip = [row0, row1, row2, row3, row4]
   *
   *  NOTE: fences do NOT block knight movement (knight always jumps).
   *  Rivers block landing squares only — place them to channel routes, not to wall off.
   *
   *  Future work: Long Level Creator — a visual tool to author strip arrays with
   *  more than 9 rows/cols; documented in PART2_STEPS.md Milestone 16.
   * ─────────────────────────────────────────────────────────────────────────
   */

  // K5 — [↔ scroll] 11-col mountain range: knight leaps peak to peak in 6 jumps.
  // Rivers in the middle rows channel the knight upward, creating a satisfying
  // diagonal zigzag from the bottom-left cliff to the top-right summit.
  //
  // Optimal path (6 moves — all (−2,+1) or (±1,+2) L-shapes going rightward):
  //   (4,0)→(2,1)  (−2,+1) ✓
  //   (2,1)→(0,2)  (−2,+1) ✓
  //   (0,2)→(1,4)  (+1,+2) ✓
  //   (1,4)→(0,6)  (−1,+2) ✓
  //   (0,6)→(1,8)  (+1,+2) ✓
  //   (1,8)→(0,10) (−1,+2) ✓  goal!
  //
  // Food at (2,3) and (1,7) lies just off the optimal path — collectible bonus.
  compileScrollLevel({
    name: 'Peak to Peak',
    description: 'The mountain range stretches on and on. The knight leaps from summit to summit!',
    hint: 'Each jump carries you two columns forward. Find a path that keeps climbing higher!',
    pieceType: 'knight',
    axis: 'horizontal',
    starThresholds: { three: 6, two: 8 },
    strips: [
      // strips[i] = col i; each strip = [row0, row1, row2, row3, row4]
      [0,   0,   0,   0,   'S'],  // col 0  — start at row 4
      [0,   0,   0,   0,   0  ],  // col 1
      [0,   0,   0,   0,   0  ],  // col 2
      [0,   0,   'F', 'R', 0  ],  // col 3  — food at row 2; river at row 3 (channels upward)
      [0,   0,   0,   0,   0  ],  // col 4
      [0,   0,   'R', 'R', 0  ],  // col 5  — rivers at rows 2–3 (dense mountain pass)
      [0,   0,   0,   0,   0  ],  // col 6
      [0,   'F', 0,   'R', 0  ],  // col 7  — food at row 1; river at row 3
      [0,   0,   0,   0,   0  ],  // col 8
      [0,   0,   'R', 'R', 0  ],  // col 9  — rivers at rows 2–3 (final pass before summit)
      ['G', 0,   0,   0,   0  ],  // col 10 — goal at row 0 (the far summit)
    ],
  }),

  {
    // K6 — full river across row 2; no bridge anywhere.
    // Every piece except the knight is completely stuck — no crossing at all.
    // The knight must route around the impassable landing row via a forced 3-jump path.
    //
    // Path: (4,1)→(3,3)→(1,4)→(0,2). 3 moves.
    //   (4,1)+(−1,+2)=(3,3) ✓
    //   (3,3)+(−2,+1)=(1,4) ✓
    //   (1,4)+(−1,−2)=(0,2) ✓  goal!
    //
    // Alternative routes also exist but all require 3+ moves — no shortcut.
    name: 'The Ambush',
    description: 'The river floods every crossing! The knight must find a way no one else can.',
    hint: 'You cannot land on the river. Find a path that hops all the way around it!',
    pieceType: 'knight',
    start: { row: 4, col: 1 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 3, two: 5 },
    obstacles: {
      fences: [],
      rivers: [
        { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
        { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
      bridges: [],
      food: [],
    },
  },

  {
    // K7 — food scattered on likely landing squares.
    // Teaching: landing on food collects it automatically — unlike the pawn,
    // food does NOT block the knight's path. It is a delight, not an obstacle.
    //
    // Direct path: (4,2)→(2,3)[food collected]→(0,4). 2 moves.
    // Longer "grand tour" collects more apples but costs stars.
    name: 'Food Hunt',
    description: 'Apples everywhere! The knight snags every one it lands on — keep jumping!',
    hint: 'The knight collects an apple just by landing on it. No need to detour — it just happens!',
    pieceType: 'knight',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 2, two: 4 },
    obstacles: {
      fences: [],
      rivers: [],
      bridges: [],
      food: [
        { row: 2, col: 3 },  // on the direct 2-move path — collected automatically
        { row: 3, col: 0 },  // temptation — reachable but adds moves
        { row: 3, col: 4 },  // temptation — another detour apple
        { row: 1, col: 1 },  // deep temptation — fun grand-tour option
      ],
    },
  },

  // K8 — [↕ scroll] 11-row summit: knight climbs the whole mountain in 5 jumps.
  // Rivers in the flanks funnel the knight along a central zigzag.
  // Food at (6,2) falls right on the optimal path — collected mid-climb for free!
  //
  // Optimal path (5 moves — minimum possible for Δrow=−10):
  //   (10,2)→(8,1)  (−2,−1) ✓
  //   (8,1) →(6,2)  (−2,+1) ✓  [eats food at (6,2)]
  //   (6,2) →(4,1)  (−2,−1) ✓
  //   (4,1) →(2,2)  (−2,+1) ✓
  //   (2,2) →(0,1)  (−2,−1) ✓  goal!
  compileScrollLevel({
    name: 'The Summit',
    description: 'The highest peak in the kingdom. Five great leaps — and the view from the top is worth every one.',
    hint: 'The rivers block the edges. Stay near the middle and keep jumping upward!',
    pieceType: 'knight',
    axis: 'vertical',
    starThresholds: { three: 5, two: 7 },
    strips: [
      // strips[i] = row i; each strip = [col0, col1, col2, col3, col4]
      [0,   'G', 0,   0,   0  ],  // row 0  — goal at col 1
      [0,   0,   0,   0,   0  ],  // row 1  — open
      [0,   0,   0,   0,   0  ],  // row 2  — open
      ['R', 0,   0,   0,   'R'],  // row 3  — rivers at both edges (funnel center)
      [0,   0,   0,   'F', 0  ],  // row 4  — food at col 3 (temptation off the path)
      [0,   0,   0,   'R', 'R'],  // row 5  — rivers at cols 3–4 (push knight left)
      [0,   0,   'F', 0,   0  ],  // row 6  — food at col 2 (ON the optimal path!)
      ['R', 0,   0,   0,   0  ],  // row 7  — river at col 0 (push knight right)
      [0,   0,   0,   0,   0  ],  // row 8  — open
      [0,   0,   0,   'R', 'R'],  // row 9  — rivers at cols 3–4 (narrow the approach)
      [0,   0,   'S', 0,   0  ],  // row 10 — start at col 2
    ],
  }),
];

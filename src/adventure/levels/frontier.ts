import { Level } from '../../types';
import { compileScrollLevel } from '../levelDef';

// ─── Starfield Frontier — World 7 ────────────────────────────────────────────
// Teaching arc: situational piece judgment — which piece fits which terrain?
// Every level is solvable by multiple pieces; the terrain strongly favors one.
// The Piece Selector (shown on every intro card) lets the player choose.
//
//  S1  Star Drift         open sky — any piece, piece selector debut
//  S2  Rift Crossing      void rift row + starlane — rook uses the lane
//  S3  Gate Maze          dense laser gates (fences) — knight ignores all
//  S4  Long Vacuum   [↔]  11-col open corridor — rook fires across in 1 move
//  S5  Diagonal Lanes     straight paths rifted, diagonals clear — bishop shines
//  S6  Broken Orbit       dense rifts + gate maze — knight L-jumps cut through
//  S7  Supply Run         food on a diagonal zig-zag — pawn diagonal captures
//  S8  Frontier Convergence [↕] 11-row mixed terrain — rook highway, then rift maze

export const frontierLevels: Level[] = [

  // ── S1 — Star Drift ──────────────────────────────────────────────────────
  // Open board, any piece. Piece Selector debut — no wrong answer.
  // Rook: 1 move. Bishop: 2 moves. Knight: 2 moves. Pawn/King: 4 moves.
  {
    name: 'Star Drift',
    description: 'The stars stretch out in every direction. Pick your piece and find your path!',
    hint: 'Any piece can reach the flag out here. Try them all and see who is fastest!',
    pieceType: 'rook',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 1, two: 2 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
    contrastData: [
      { piece: 'bishop', moves: 2 },
      { piece: 'pawn',   moves: 4 },
    ],
    contrastTakeaway: 'Open sky favors the rook — one straight shot. Every piece gets there eventually.',
  },

  // ── S2 — Rift Crossing ───────────────────────────────────────────────────
  // Void rift runs across the whole board. One starlane (bridge) at col 2.
  // Rook: 1 move — slides straight through the bridge.
  // Knight: must navigate around; col 2 bridge landing blocked → 4+ moves.
  {
    name: 'Rift Crossing',
    description: 'A void rift splits the sky. One starlane cuts right through — but only a straight slider can use it.',
    hint: 'The rook can slide through the starlane without stopping. Can anything else?',
    pieceType: 'rook',
    start: { row: 4, col: 2 },
    goal:  { row: 0, col: 2 },
    starThresholds: { three: 1, two: 2 },
    obstacles: {
      fences:  [],
      rivers:  [
        { row: 2, col: 0 }, { row: 2, col: 1 },
        { row: 2, col: 2 }, // bridge cell — river + bridge
        { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
      bridges: [{ row: 2, col: 2 }], // col-2 is the starlane
      food: [],
    },
    contrastData: [
      { piece: 'knight', moves: 4 },
      { piece: 'king',   moves: 6 },
    ],
    contrastTakeaway: 'The starlane is a rook highway. Anything that can\'t slide has to go the long way around.',
  },

  // ── S3 — Gate Maze ───────────────────────────────────────────────────────
  // Two laser-gate fences block straight paths. Knight jumps over both in 2 moves.
  // Rook must find narrow gaps, taking 5+ moves.
  // Gate 1: fB on row 1, all cols except col 2  (gap at col 2)
  // Gate 2: fB on row 3, all cols except col 1  (gap at col 1)
  compileScrollLevel({
    name: 'Gate Maze',
    description: 'Laser gates seal every straight corridor. Something that can leap over them will cut through in seconds.',
    hint: 'The knight jumps over gates entirely — it doesn\'t need gaps at all!',
    pieceType: 'knight',
    axis: 'vertical',
    starThresholds: { three: 2, two: 4 },
    contrastData: [
      { piece: 'rook',   moves: 5 },
      { piece: 'bishop', moves: 4 },
    ],
    contrastTakeaway: 'Gates are walls to sliders. The knight doesn\'t even see them.',
    strips: [
      // strips[i] = row i for vertical axis (piece starts top, moves down to goal)
      /* row 0 */ [0,   0,   'S', 0,   0  ],
      /* row 1 */ [{ fB: true }, { fB: true }, 0, { fB: true }, { fB: true }],
      /* row 2 */ [0,   0,   0,   0,   0  ],
      /* row 3 */ [{ fB: true }, 0, { fB: true }, { fB: true }, { fB: true }],
      /* row 4 */ [0,   0,   'G', 0,   0  ],
    ],
  }),

  // ── S4 — Long Vacuum ─────────────────────────────────────────────────────
  // [↔ horizontal scroll] 11-column open corridor.
  // Rook: 1 move — fires the full length in one shot.
  // Bishop: 6+ moves of diagonal zigzag.
  // King: 10 moves. Pawn: can barely reach.
  compileScrollLevel({
    name: 'Long Vacuum',
    description: 'An endless corridor through deep space. One piece can cross it in a single heartbeat.',
    hint: 'The rook slides as far as the board allows — all the way to the other end!',
    pieceType: 'rook',
    axis: 'horizontal',
    starThresholds: { three: 1, two: 2 },
    contrastData: [
      { piece: 'bishop', moves: 6 },
      { piece: 'king',   moves: 10 },
    ],
    contrastTakeaway: 'Distance is nothing to a rook. A bishop zigzags; a king plods. Same corridor — completely different journeys.',
    strips: [
      // strips[i] = col i; each strip = [row0, row1, row2, row3, row4]
      /* col 0  */ [0, 0, 'S', 0, 0],
      /* col 1  */ [0, 0,  0,  0, 0],
      /* col 2  */ [0, 0,  0,  0, 0],
      /* col 3  */ [0, 0,  0,  0, 0],
      /* col 4  */ [0, 0,  0,  0, 0],
      /* col 5  */ [0, 0,  0,  0, 0],
      /* col 6  */ [0, 0,  0,  0, 0],
      /* col 7  */ [0, 0,  0,  0, 0],
      /* col 8  */ [0, 0,  0,  0, 0],
      /* col 9  */ [0, 0,  0,  0, 0],
      /* col 10 */ [0, 0, 'G', 0, 0],
    ],
  }),

  // ── S5 — Diagonal Lanes ──────────────────────────────────────────────────
  // Void rifts seal all straight lines; diagonal lanes are open.
  // Bishop: 1 move — pure diagonal (4,0)→(0,4).
  // Rook: 3 moves using the bridges at the edges of the rift row.
  // Rivers form a + cross; center (2,2) is clear; bridges at (2,0) and (2,4)
  // let rook sneak through the row edges.
  {
    name: 'Diagonal Lanes',
    description: 'The void rifts seal every straight path. Only diagonals are clear — this terrain was built for one piece.',
    hint: 'Follow the diagonal from corner to corner — no zigzag needed!',
    pieceType: 'bishop',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 4 },
    starThresholds: { three: 1, two: 2 },
    contrastData: [
      { piece: 'rook',   moves: 3 },
      { piece: 'knight', moves: 3 },
    ],
    contrastTakeaway: 'When every straight path is blocked, diagonals are a superpower. The bishop crossed in one step.',
    obstacles: {
      fences:  [],
      rivers:  [
        // col-2 void (straight up from start blocked)
        { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 3, col: 2 }, { row: 4, col: 2 },
        // row-2 void (horizontal bar, bridges at edges let rook detour)
        { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
      bridges: [
        { row: 2, col: 0 }, // rook can slide through col 0 on row 2
        { row: 2, col: 4 }, // rook can slide through col 4 on row 2
      ],
      food: [],
    },
  },

  // ── S6 — Broken Orbit ────────────────────────────────────────────────────
  // Dense rift clusters + a laser gate. Knight L-jumps straight through.
  // Rook: must navigate a long winding path around each cluster.
  // Gate: fB on row 2, cols 1–3.  Rivers flank the approach at rows 1 and 3.
  compileScrollLevel({
    name: 'Broken Orbit',
    description: 'Rifts and gates block every straight path. One piece doesn\'t care about walls at all.',
    hint: 'The knight jumps — it doesn\'t slide, so gates and rifts mean nothing!',
    pieceType: 'knight',
    axis: 'vertical',
    starThresholds: { three: 2, two: 4 },
    contrastData: [
      { piece: 'rook',   moves: 7 },
      { piece: 'bishop', moves: 5 },
    ],
    contrastTakeaway: 'Rifts and gates are invisible to the knight. Every other piece has to find a way around.',
    strips: [
      // piece starts top, moves down to goal
      /* row 0 */ [0,   0,   'S', 0,   0  ],
      /* row 1 */ [0,  'R',   0, 'R',  0  ],
      /* row 2 */ [0, { fB: true }, { fB: true }, { fB: true }, 0],
      /* row 3 */ [0,  'R',   0, 'R',  0  ],
      /* row 4 */ [0,   0,   'G', 0,   0  ],
    ],
  }),

  // ── S7 — Supply Run ──────────────────────────────────────────────────────
  // Food on a diagonal zig-zag path. Pawn eats diagonally and advances.
  // Pawn: 4 moves — three diagonal eats then one forward step to goal.
  // Rook: stops on each food, taking 5+ moves including turns.
  // River at col 0 row 2 forces rook off the simple up-then-right path.
  {
    name: 'Supply Run',
    description: 'Fuel cells line the diagonal approach. One piece is built to zig-zag exactly like this.',
    hint: 'The pawn eats one step diagonally — follow the apple trail all the way to the flag!',
    pieceType: 'pawn',
    start: { row: 4, col: 0 },
    goal:  { row: 0, col: 3 },
    starThresholds: { three: 4, two: 6 },
    contrastData: [
      { piece: 'rook',   moves: 5 },
      { piece: 'bishop', moves: 4 },
    ],
    contrastTakeaway: 'The pawn eats diagonally — the fuel cells were laid out just for it.',
    obstacles: {
      fences: [],
      rivers: [
        { row: 2, col: 0 }, // blocks rook from sliding straight up col 0
        { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, // row 0 sealed except goal
      ],
      bridges: [],
      food: [
        { row: 3, col: 1 }, // pawn (4,0) → diagonal eat → (3,1)
        { row: 2, col: 2 }, // pawn (3,1) → diagonal eat → (2,2)
        { row: 1, col: 3 }, // pawn (2,2) → diagonal eat → (1,3) → forward → (0,3) goal
      ],
    },
  },

  // ── S8 — Frontier Convergence ────────────────────────────────────────────
  // [↕ vertical scroll] 11-row finale.
  // Upper zone (rows 0–6): open highway — rook slides freely.
  // Lower zone (rows 7–10): rift clusters flanking col 2 — requires navigation.
  // Default piece: rook (races through upper zone, navigates lower).
  // With piece selector: try knight to cut through the lower zone with L-jumps.
  compileScrollLevel({
    name: 'Frontier Convergence',
    description: 'Half open highway, half rift field. One piece blazes through the vacuum — but can it handle the maze at the end?',
    hint: 'The rook is fast on the open stretch. For the rift field ahead, think about what can jump.',
    pieceType: 'rook',
    axis: 'vertical',
    starThresholds: { three: 3, two: 5 },
    contrastData: [
      { piece: 'knight', moves: 5 },
      { piece: 'bishop', moves: 7 },
    ],
    contrastTakeaway: 'Two terrains, two challenges. No single piece dominates everything — that\'s the frontier.',
    strips: [
      // strips[i] = row i (row 0 = top/start, row 10 = bottom/goal)
      /* row 0  */ [0,   0,   'S', 0,   0  ],
      /* row 1  */ [0,   0,    0,  0,   0  ],  // open rook highway
      /* row 2  */ [0,   0,    0,  0,   0  ],
      /* row 3  */ [0,   0,    0,  0,   0  ],
      /* row 4  */ [0,   0,    0,  0,   0  ],
      /* row 5  */ [0,   0,    0,  0,   0  ],
      /* row 6  */ [0,   0,    0,  0,   0  ],  // clear transition
      /* row 7  */ [0,  'R',   0, 'R',  0  ],  // rifts flanking col 2
      /* row 8  */ ['R', 0,    0,  0,  'R'],   // outer rifts
      /* row 9  */ [0,  'R',   0, 'R',  0  ],  // rifts again
      /* row 10 */ [0,   0,   'G', 0,   0  ],
    ],
  }),
];

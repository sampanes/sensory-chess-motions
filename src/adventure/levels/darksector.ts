import { Level } from '../../types';

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };

// ── D1: The Guard Rail ────────────────────────────────────────────────────────
const d1: Level = {
  name: 'The Guard Rail',
  description: 'Something glows across the board. Watch where it reaches.',
  pieceType: 'king',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 0 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 4, two: 6 },
  obstacles: EMPTY,
  watchPhaseLabel: 'The rook guards its whole row — and its whole column.',
  patrolPieces: [
    {
      pieceType: 'rook',
      route: [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
      routeMode: 'pingpong',
    },
  ],
  hint: 'Column 0 and column 1 are never in its path.',
};

// ── D2: The Diagonal Shadow ───────────────────────────────────────────────────
const d2: Level = {
  name: 'The Diagonal Shadow',
  description: 'The glow forms an X across the board. Straight paths are invisible to it.',
  pieceType: 'king',
  start: { row: 4, col: 4 },
  goal:  { row: 0, col: 4 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 5, two: 7 },
  obstacles: EMPTY,
  watchPhaseLabel: 'The bishop guards its diagonals — the lines that go corner to corner.',
  patrolPieces: [
    {
      pieceType: 'bishop',
      route: [{ row: 0, col: 0 }, { row: 2, col: 2 }, { row: 4, col: 4 }],
      routeMode: 'pingpong',
    },
  ],
  hint: 'Straight-line squares are invisible to the bishop.',
};

// ── D3: The Blind Spots ───────────────────────────────────────────────────────
const d3: Level = {
  name: 'The Blind Spots',
  description: "The knight's glow looks scary. But look closer — it can't see everything.",
  pieceType: 'rook',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 5, boardWidth: 5,
  starThresholds: { three: 4, two: 5 },
  obstacles: EMPTY,
  watchPhaseLabel: "The knight guards L-shaped spots — everything else is invisible to it.",
  patrolPieces: [
    {
      pieceType: 'knight',
      route: [
        { row: 2, col: 2 }, { row: 0, col: 1 },
        { row: 2, col: 0 }, { row: 4, col: 1 },
      ],
      routeMode: 'loop',
    },
  ],
  hint: 'The knight cannot see column 2 from any of its patrol positions.',
};

// ── D4: The Queen's Watch ─────────────────────────────────────────────────────
const d4: Level = {
  name: "The Queen's Watch",
  description: "Rows. Columns. Diagonals. The queen watches everything.",
  pieceType: 'king',
  start: { row: 5, col: 0 },
  goal:  { row: 0, col: 5 },
  boardHeight: 6, boardWidth: 6,
  starThresholds: { three: 10, two: 14 },
  obstacles: EMPTY,
  // No watchPhaseLabel — child has seen rook and bishop; let them discover the queen is both
  patrolPieces: [
    {
      pieceType: 'queen',
      route: [
        { row: 3, col: 3 }, { row: 3, col: 1 }, { row: 1, col: 3 },
      ],
      routeMode: 'loop',
    },
  ],
  hint: 'The queen cannot watch all four edges at once.',
};

// ── D5: Crossroads ────────────────────────────────────────────────────────────
const d5: Level = {
  name: 'Crossroads',
  description: 'Two watches. One gap. Find when they both look away.',
  pieceType: 'queen',
  start: { row: 5, col: 0 },
  goal:  { row: 0, col: 5 },
  boardHeight: 6, boardWidth: 6,
  starThresholds: { three: 3, two: 6 },
  obstacles: EMPTY,
  patrolPieces: [
    {
      pieceType: 'rook',
      route: [{ row: 2, col: 0 }, { row: 2, col: 3 }, { row: 2, col: 5 }],
      routeMode: 'pingpong',
    },
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 3, col: 3 }, { row: 5, col: 3 }],
      routeMode: 'pingpong',
    },
  ],
};

// ── D6: The Gauntlet (horizontal scroll) ──────────────────────────────────────
const d6: Level = {
  name: 'The Gauntlet',
  description: 'Three checkpoints. One corridor. Keep moving.',
  pieceType: 'rook',
  start: { row: 2, col: 0 },
  goal:  { row: 2, col: 12 },
  boardHeight: 5, boardWidth: 13,
  scrollAxis: 'horizontal',
  starThresholds: { three: 8, two: 14 },
  obstacles: EMPTY,
  patrolPieces: [
    // Checkpoint 1: rook guards column 3
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 2, col: 3 }, { row: 4, col: 3 }],
      routeMode: 'pingpong',
      startIndex: 1,
    },
    // Checkpoint 2: bishop patrols diagonal through (2,7)
    {
      pieceType: 'bishop',
      route: [{ row: 0, col: 5 }, { row: 2, col: 7 }, { row: 4, col: 9 }],
      routeMode: 'pingpong',
    },
    // Checkpoint 3: rook guards column 10 (tighter range)
    {
      pieceType: 'rook',
      route: [{ row: 1, col: 10 }, { row: 3, col: 10 }],
      routeMode: 'pingpong',
    },
  ],
};

// ── D7: Closing In ────────────────────────────────────────────────────────────
const d7: Level = {
  name: 'Closing In',
  description: "The window is shrinking. Commit before it's gone.",
  pieceType: 'queen',
  start: { row: 6, col: 3 },
  goal:  { row: 0, col: 3 },
  boardHeight: 7, boardWidth: 7,
  starThresholds: { three: 6, two: 10 },
  obstacles: EMPTY,
  patrolPieces: [
    // Left rook: starts at (3,0) and cycles toward (3,3) (center)
    {
      pieceType: 'rook',
      route: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Right rook: starts at (3,6) and cycles toward (3,4) (center), mirrored
    {
      pieceType: 'rook',
      route: [{ row: 3, col: 6 }, { row: 3, col: 5 }, { row: 3, col: 4 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
  ],
};

// ── D8: The Dark Core (vertical scroll) ───────────────────────────────────────
const d8: Level = {
  name: 'The Dark Core',
  description: 'The sector is alive. Thread the needle.',
  pieceType: 'rook',
  start: { row: 10, col: 2 },
  goal:  { row: 0, col: 2 },
  boardHeight: 11, boardWidth: 5,
  scrollAxis: 'vertical',
  starThresholds: { three: 8, two: 14 },
  obstacles: EMPTY,
  patrolPieces: [
    // Lower zone (rows 7-10): slow rook, row 8
    {
      pieceType: 'rook',
      route: [{ row: 8, col: 0 }, { row: 8, col: 2 }, { row: 8, col: 4 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Middle zone (rows 4-6): bishop, anti-diagonal through (5,2)
    {
      pieceType: 'bishop',
      route: [{ row: 3, col: 4 }, { row: 5, col: 2 }, { row: 7, col: 0 }],
      routeMode: 'pingpong',
    },
    // Upper zone: rook guarding col 1
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 1 }, { row: 3, col: 1 }],
      routeMode: 'pingpong',
      startIndex: 0,
    },
    // Upper zone: rook guarding col 3
    {
      pieceType: 'rook',
      route: [{ row: 0, col: 3 }, { row: 3, col: 3 }],
      routeMode: 'pingpong',
      startIndex: 2, // starts at far end so player gets a brief window on arrival
    },
  ],
};

export const darkSectorLevels: Level[] = [d1, d2, d3, d4, d5, d6, d7, d8];

/**
 * World 8 — The Shadow Pieces
 *
 * Introduces captures: enemy pieces (shadow copies) block the board.
 * Landing on an enemy removes it. captureAll levels win when every
 * shadow is cleared; normal levels have a goal AND enemies in the way.
 */

import { Level } from '../../types';

export const shadowLevels: Level[] = [
  // ── S1 "Your First Shadow" ───────────────────────────────────────────────
  // King must step through an enemy to reach the flag.
  {
    name: 'Your First Shadow',
    description: 'A dark copy blocks your path. Walk into it to capture it — then reach the flag.',
    hint: 'Just step onto the shadow piece to capture it!',
    pieceType: 'king',
    start:  { row: 4, col: 2 },
    goal:   { row: 0, col: 2 },
    enemies: [{ row: 2, col: 2, pieceType: 'king' }],
    captureAll: false,
    starThresholds: { three: 4, two: 7 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S2 "Double Threat" ───────────────────────────────────────────────────
  // Rook must sweep the board and capture two corners.
  {
    name: 'Double Threat',
    description: 'Two shadow rooks lurk in opposite corners. Capture them both to clear the board!',
    hint: 'Rooks slide the whole row or column in one move.',
    pieceType: 'rook',
    start:  { row: 4, col: 0 },
    goal:   { row: -1, col: -1 }, // captureAll — no flag
    enemies: [
      { row: 0, col: 0, pieceType: 'rook' },
      { row: 4, col: 4, pieceType: 'rook' },
    ],
    captureAll: true,
    starThresholds: { three: 3, two: 5 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S3 "Diagonal Ghosts" ─────────────────────────────────────────────────
  // Bishop hunts two enemies along diagonals.
  {
    name: 'Diagonal Ghosts',
    description: 'Two shadow bishops hide in opposite corners. Hunt them down the diagonals!',
    hint: 'Bishop only moves diagonally — both enemies are on your diagonal.',
    pieceType: 'bishop',
    start:  { row: 2, col: 2 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 0, col: 0, pieceType: 'bishop' },
      { row: 4, col: 4, pieceType: 'bishop' },
    ],
    captureAll: true,
    starThresholds: { three: 3, two: 5 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S4 "The L-Shaped Hunt" ───────────────────────────────────────────────
  // Knight bounces between three spread-out enemies.
  {
    name: 'The L-Shaped Hunt',
    description: "Three shadow knights scattered wide. Only your L-shaped jumps can reach them all!",
    hint: "The knight's L-jump is the only move that can reach every shadow.",
    pieceType: 'knight',
    start:  { row: 2, col: 2 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 3, col: 0, pieceType: 'knight' },
      { row: 0, col: 3, pieceType: 'knight' },
      { row: 4, col: 3, pieceType: 'knight' },
    ],
    captureAll: true,
    starThresholds: { three: 5, two: 8 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S5 "Pawn's Courage" ──────────────────────────────────────────────────
  // Pawn captures diagonally — exactly like real chess!
  {
    name: "Pawn's Courage",
    description: 'Two shadows block the way. Pawns can capture diagonally — step sideways-forward to defeat them!',
    hint: 'Pawns capture one step diagonally forward. Chain both captures!',
    pieceType: 'pawn',
    start:  { row: 2, col: 2 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 1, col: 1, pieceType: 'pawn' },
      { row: 0, col: 2, pieceType: 'pawn' },
    ],
    captureAll: true,
    starThresholds: { three: 2, two: 4 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S6 "Queen's Sweep" ───────────────────────────────────────────────────
  // Queen threads through three enemies in an L-shaped sweep.
  {
    name: "Queen's Sweep",
    description: 'Three shadows lurk in an L. The queen can slide straight AND diagonally — use both!',
    hint: 'Slide along the bottom row, then up the column, then cut diagonally.',
    pieceType: 'queen',
    start:  { row: 4, col: 4 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 4, col: 0, pieceType: 'rook' },
      { row: 0, col: 0, pieceType: 'bishop' },
      { row: 2, col: 2, pieceType: 'king'  },
    ],
    captureAll: true,
    starThresholds: { three: 3, two: 5 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S7 "Shadow Army" ─────────────────────────────────────────────────────
  // Rook must lap the four corner sentinels.
  {
    name: 'Shadow Army',
    description: 'Four shadow pieces guard the corners. Sweep the perimeter and take them all!',
    hint: 'Rooks can clear an entire row or column in one slide.',
    pieceType: 'rook',
    start:  { row: 2, col: 0 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 0, col: 0, pieceType: 'rook' },
      { row: 0, col: 4, pieceType: 'rook' },
      { row: 4, col: 4, pieceType: 'rook' },
      { row: 4, col: 0, pieceType: 'rook' },
    ],
    captureAll: true,
    starThresholds: { three: 4, two: 6 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },

  // ── S8 "The Final Shadow" ────────────────────────────────────────────────
  // Queen faces four shadows arranged in a cross — chain diagonal slides.
  {
    name: 'The Final Shadow',
    description: 'Four shadows stand in a cross. The queen must hunt every last one. This is what queens do.',
    hint: 'Think ahead — can you chain all four captures in four moves?',
    pieceType: 'queen',
    start:  { row: 2, col: 2 },
    goal:   { row: -1, col: -1 },
    enemies: [
      { row: 0, col: 2, pieceType: 'queen' },
      { row: 2, col: 4, pieceType: 'queen' },
      { row: 4, col: 2, pieceType: 'queen' },
      { row: 2, col: 0, pieceType: 'queen' },
    ],
    captureAll: true,
    starThresholds: { three: 4, two: 7 },
    obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  },
];

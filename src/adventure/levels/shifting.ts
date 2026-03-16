/**
 * The Shifting Grounds — optional challenge levels (one per main world, worlds 0–5).
 *
 * Each level demonstrates dynamic cells: specific squares seal into rivers on a
 * set move number. The player must plan ahead or get cut off.
 *
 * These are accessed from "?" nodes on the world map (visible once the
 * associated main world is completed). They are NOT part of WORLD_LEVELS.
 */

import { Level } from '../../types';

// ── SG1 "No Going Back" (king, world 0) ──────────────────────────────────────
// The center column seals behind the king one square at a time.
// Every step is final — the king cannot retreat.
const sg1: Level = {
  name: 'No Going Back',
  description: 'Each step you take seals the square behind you. There is no retreat — only forward.',
  hint: 'Walk straight to the flag. If you wander, the path home disappears.',
  pieceType: 'king',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  starThresholds: { three: 4, two: 7 },
  obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  dynamicRivers: [
    { row: 4, col: 2, appearsOnMove: 1 },
    { row: 3, col: 2, appearsOnMove: 2 },
    { row: 2, col: 2, appearsOnMove: 3 },
  ],
};

// ── SG2 "Harvest Rush" (pawn, world 1) ───────────────────────────────────────
// The sides of each row seal as the pawn passes through, closing into a corridor.
// Collect every apple before the field floods shut.
const sg2: Level = {
  name: 'Harvest Rush',
  description: "The field seals behind you as you go. Gather every apple — there's no coming back for them.",
  hint: 'March straight up the middle. The sides will close in, but the path stays open.',
  pieceType: 'pawn',
  start: { row: 4, col: 2 },
  goal:  { row: 0, col: 2 },
  starThresholds: { three: 4, two: 5 },
  obstacles: {
    fences: [], rivers: [], bridges: [],
    food: [
      { row: 3, col: 2 },
      { row: 2, col: 2 },
      { row: 1, col: 2 },
    ],
  },
  dynamicRivers: [
    { row: 3, col: 0, appearsOnMove: 1 }, { row: 3, col: 1, appearsOnMove: 1 },
    { row: 3, col: 3, appearsOnMove: 1 }, { row: 3, col: 4, appearsOnMove: 1 },
    { row: 2, col: 0, appearsOnMove: 2 }, { row: 2, col: 1, appearsOnMove: 2 },
    { row: 2, col: 3, appearsOnMove: 2 }, { row: 2, col: 4, appearsOnMove: 2 },
    { row: 1, col: 0, appearsOnMove: 3 }, { row: 1, col: 1, appearsOnMove: 3 },
    { row: 1, col: 3, appearsOnMove: 3 }, { row: 1, col: 4, appearsOnMove: 3 },
  ],
};

// ── SG3 "One-Way Bridge" (rook, world 2) ─────────────────────────────────────
// A river wall across row 2 with one open crossing. Food guides the rook to
// the crossing — but once it passes through, the crossing seals behind it.
const sg3: Level = {
  name: 'One-Way Bridge',
  description: 'A single crossing breaks the river wall. Cross it — but once you do, the bridge is gone.',
  hint: 'Follow the apples to the crossing, then push straight to the goal.',
  pieceType: 'rook',
  start: { row: 4, col: 0 },
  goal:  { row: 0, col: 4 },
  starThresholds: { three: 4, two: 6 },
  obstacles: {
    fences: [], bridges: [],
    rivers: [
      { row: 2, col: 0 }, { row: 2, col: 1 },
      { row: 2, col: 3 }, { row: 2, col: 4 },
    ],
    food: [
      { row: 4, col: 2 }, // stops rook sliding right at col 2
      { row: 2, col: 2 }, // stops rook sliding up at row 2 crossing
    ],
  },
  dynamicRivers: [
    { row: 2, col: 2, appearsOnMove: 3 }, // crossing seals after rook moves through it
  ],
};

// ── SG4 "Now or Never" (bishop, world 3) ─────────────────────────────────────
// A river wall spans the middle of the board with one diagonal gap.
// The gap seals on move 2 — commit to the diagonal immediately or lose the path.
const sg4: Level = {
  name: 'Now or Never',
  description: 'The diagonal crossing seals on your second move. Commit immediately — hesitation costs the path.',
  hint: 'Head straight for (2,2) on your first move. The gap closes right after.',
  pieceType: 'bishop',
  start: { row: 0, col: 0 },
  goal:  { row: 4, col: 4 },
  starThresholds: { three: 2, two: 4 },
  obstacles: {
    fences: [], bridges: [], food: [],
    rivers: [
      { row: 2, col: 0 }, { row: 2, col: 1 },
      { row: 2, col: 3 }, { row: 2, col: 4 },
    ],
  },
  dynamicRivers: [
    { row: 2, col: 2, appearsOnMove: 2 }, // gap seals — bishop stranded if it hasn't crossed
  ],
};

// ── SG5 "Vanishing Footprints" (knight, world 4) ─────────────────────────────
// The knight's landing squares seal after it uses them. It cannot revisit.
// Intended path: (0,0)→(2,1)→(4,2)→(2,3)→(4,4).
const sg5: Level = {
  name: 'Vanishing Footprints',
  description: "Every square the knight lands on seals behind it. Map your L-shapes — you can't retrace a step.",
  hint: 'Jump toward the goal. Each square you leave is gone forever.',
  pieceType: 'knight',
  start: { row: 0, col: 0 },
  goal:  { row: 4, col: 4 },
  starThresholds: { three: 4, two: 7 },
  obstacles: { fences: [], rivers: [], bridges: [], food: [] },
  dynamicRivers: [
    { row: 0, col: 0, appearsOnMove: 1 }, // start seals after first jump
    { row: 2, col: 1, appearsOnMove: 2 }, // second footprint seals
    { row: 4, col: 2, appearsOnMove: 3 }, // third footprint seals
  ],
};

// ── SG6 "The Shrinking Court" (queen, world 5) ───────────────────────────────
// The queen must collect two food items along a route, but her starting square
// seals on move 1 — she cannot circle back to the center.
const sg6: Level = {
  name: 'The Shrinking Court',
  description: 'Collect both apples and reach the corner. But your starting square seals after your first move.',
  hint: 'Go up for the apple, cut diagonally to the second, then sweep to the goal.',
  pieceType: 'queen',
  start: { row: 2, col: 2 },
  goal:  { row: 4, col: 4 },
  starThresholds: { three: 3, two: 5 },
  obstacles: {
    fences: [], rivers: [], bridges: [],
    food: [
      { row: 0, col: 2 }, // first apple — straight up
      { row: 2, col: 0 }, // second apple — diagonal from (0,2)
    ],
  },
  dynamicRivers: [
    { row: 2, col: 2, appearsOnMove: 1 }, // center seals — can't come back
  ],
};

// ─── Exported record ─────────────────────────────────────────────────────────

/** Maps world id (0–5) → its single Shifting Grounds challenge level. */
export const CHALLENGE_LEVELS: Record<number, Level> = {
  0: sg1,
  1: sg2,
  2: sg3,
  3: sg4,
  4: sg5,
  5: sg6,
};

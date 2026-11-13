// The real board: where every piece starts, and a little picture of how each
// one moves. Used by the printable grown-up card (?card) and by the "set up
// the board" puzzle. Pure data, checked by tests/setup.test.ts.

import { hopsFor } from './rules.ts';
import type { Kind, Puzzle } from './types.ts';

/** A real board is eight squares each way. */
export const BOARD = 8;

/** The back row from left to right, as the player sees it from their own side (a1..h1 for White). */
export const BACK_RANK: readonly Kind[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

export interface Placed {
  kind: Kind;
  at: number;
}

/**
 * A light square. A real board is turned so that each player has a light
 * square in the right-hand corner; row 0 is the top, so the bottom-right
 * corner (row 7, column 7) is light.
 */
export function isLightSquare(pos: number, cols = BOARD): boolean {
  return (Math.floor(pos / cols) + (pos % cols)) % 2 === 0;
}

/** The sixteen starting squares of the side at the bottom of the board: pawns on row 6, the rest on row 7. */
export function startingSquares(): Placed[] {
  const out: Placed[] = [];
  for (let c = 0; c < BOARD; c++) out.push({ kind: 'pawn', at: 6 * BOARD + c });
  BACK_RANK.forEach((kind, c) => out.push({ kind, at: 7 * BOARD + c }));
  return out;
}

/**
 * The far side's starting squares. The far side is a mirror image up and
 * down, not a rotation: its queen faces the near queen on the same column.
 */
export function farStartingSquares(): Placed[] {
  return startingSquares().map(({ kind, at }) => ({ kind, at: (BOARD - 1 - Math.floor(at / BOARD)) * BOARD + (at % BOARD) }));
}

export interface MoveDiagram {
  /** The diagram is a small square board, this many squares each way. */
  size: number;
  /** Where the piece stands. */
  at: number;
  /** Squares it can move to from there on an empty board, by the game's own rules. */
  moves: number[];
  /** Squares where it captures but cannot simply move (the pawn's diagonals). */
  captures: number[];
}

/** How one piece moves, on an empty 5x5 board, straight from the rules the puzzles use. */
export function moveDiagram(kind: Kind): MoveDiagram {
  const size = 5;
  const at = (kind === 'pawn' ? 3 : 2) * size + 2;
  const puzzle: Puzzle = { rows: size, cols: size, rocks: Array(size * size).fill(false), treats: [], friends: [{ kind, at }] };
  const moves = hopsFor(puzzle, { friends: puzzle.friends, left: 0 }, 0);
  const captures = kind === 'pawn' ? [at - size - 1, at - size + 1] : [];
  return { size, at, moves, captures };
}

// ---- Set up the board (lab prototype) --------------------------------------
//
// The friends are all mixed up in the middle of a real 8x8 board, and the kid
// puts each one on a starting square for its kind. Two friends of a kind are
// interchangeable (either rook may take either corner). A friend dropped on a
// wrong square of the two home rows just hops back: there is no losing.

export interface SetupLevel {
  /** Kinds the kid places; every piece of each kind is loose. */
  place: readonly Kind[];
  /** Kinds already standing on their starting squares. */
  standing: readonly Kind[];
}

export interface SetupPuzzle {
  /** Friends to place, with the middle squares they start scattered on. */
  loose: readonly Placed[];
  /** Friends already home. */
  fixed: readonly Placed[];
  /** The far side, set up and asleep: the picture to copy. */
  model: readonly Placed[];
}

export interface SetupState {
  /** Where each loose friend stands now. */
  at: readonly number[];
  /** Which loose friends are on a starting square of their kind. */
  home: readonly boolean[];
}

export type SetupDrop =
  | { kind: 'home'; state: SetupState }
  /** A square of the two home rows that is not this friend's (or is taken): it hops back. */
  | { kind: 'wrong' }
  /** Not a home-row square at all: nothing happens. */
  | { kind: 'no' };

/** Small seeded shuffle, so a level always starts scattered the same way. */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let x = (seed * 2654435761) >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    const j = x % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function makeSetup(level: SetupLevel, seed = 1): SetupPuzzle {
  const start = startingSquares();
  const placing = start.filter((p) => level.place.includes(p.kind));
  const fixed = start.filter((p) => level.standing.includes(p.kind));
  // The four middle rows are free on a set-up board: scatter the loose friends there.
  const middle = Array.from({ length: 4 * BOARD }, (_, i) => 2 * BOARD + i);
  const spots = shuffled(middle, seed + placing.length * 31);
  const kinds = shuffled(placing.map((p) => p.kind), seed + 7);
  return {
    loose: kinds.map((kind, i) => ({ kind, at: spots[i] })),
    fixed,
    model: farStartingSquares(),
  };
}

export function setupStart(p: SetupPuzzle): SetupState {
  return { at: p.loose.map((f) => f.at), home: p.loose.map(() => false) };
}

const isHomeRow = (pos: number) => Math.floor(pos / BOARD) >= BOARD - 2;

/** Squares taken by a friend standing at home (already there, or placed by the kid). */
function takenSquares(p: SetupPuzzle, s: SetupState): Set<number> {
  return new Set([...p.fixed.map((f) => f.at), ...s.at.filter((_, i) => s.home[i])]);
}

/** The free starting squares for loose friend `fi` (none once it is home). */
export function setupTargets(p: SetupPuzzle, s: SetupState, fi: number): number[] {
  if (s.home[fi]) return [];
  const taken = takenSquares(p, s);
  return startingSquares().filter((q) => q.kind === p.loose[fi].kind && !taken.has(q.at)).map((q) => q.at);
}

export function setupDrop(p: SetupPuzzle, s: SetupState, fi: number, to: number): SetupDrop {
  if (s.home[fi] || !isHomeRow(to)) return { kind: 'no' };
  if (!setupTargets(p, s, fi).includes(to)) return { kind: 'wrong' };
  return {
    kind: 'home',
    state: { at: s.at.map((at, i) => (i === fi ? to : at)), home: s.home.map((h, i) => h || i === fi) },
  };
}

export function setupWon(s: SetupState): boolean {
  return s.home.every(Boolean);
}

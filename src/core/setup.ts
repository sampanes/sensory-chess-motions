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

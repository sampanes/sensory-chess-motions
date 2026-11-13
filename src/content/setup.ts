// Set up the board (lab prototype, #/lab/setup): the levels build a real
// starting position one kind at a time, from the corners in. Rules are in
// src/core/setup.ts; tests/setup.test.ts checks every level can be finished.

import type { SetupLevel } from '../core/setup.ts';

export interface SetupLevelDef extends SetupLevel {
  /** Ids are permanent names. */
  id: string;
}

export const SETUP_SKY = '#e0e7ff';

export const SETUP_LEVELS: readonly SetupLevelDef[] = [
  // Rooks go in the corners.
  { id: 'setup-1', place: ['rook'], standing: [] },
  // Knights stand next to the rooks.
  { id: 'setup-2', place: ['knight'], standing: ['rook'] },
  // Bishops stand next to the knights.
  { id: 'setup-3', place: ['bishop'], standing: ['rook', 'knight'] },
  // The queen takes the square of her own color, the king the one that is left.
  { id: 'setup-4', place: ['queen', 'king'], standing: ['rook', 'knight', 'bishop'] },
  // Eight pawns fill the row in front.
  { id: 'setup-5', place: ['pawn'], standing: ['rook', 'knight', 'bishop', 'queen', 'king'] },
  // The whole back row at once, behind the pawns.
  { id: 'setup-6', place: ['rook', 'knight', 'bishop', 'queen', 'king'], standing: ['pawn'] },
  // Everybody.
  { id: 'setup-7', place: ['rook', 'knight', 'bishop', 'queen', 'king', 'pawn'], standing: [] },
];

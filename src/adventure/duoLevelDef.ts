/**
 * Types for two-piece cooperative levels (Milestone 13 — Multi-Piece Planning).
 *
 * DuoLevel is intentionally separate from the shared Level type so that
 * none of the single-piece engine code (moveCalculator, BoardShell, ScrollBoard,
 * types.ts) is touched or polluted by multi-piece concerns.
 */

import { Obstacle, PieceType, Position } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DuoPiece = {
  pieceType: PieceType;
  start: Position;
  goal: Position;
};

export type DuoLevel = {
  name: string;
  description: string;
  hint?: string;
  /** Exactly two pieces; pieces[0] = Piece A, pieces[1] = Piece B. */
  pieces: [DuoPiece, DuoPiece];
  obstacles: Obstacle;
  starThresholds: { three: number; two: number };
  /**
   * Static enemy pieces whose threat zones become impassable (see Level.guardPieces).
   */
  guardPieces?: Array<{ pieceType: import('../types').PieceType; position: import('../types').Position }>;
  /** @deprecated Use guardPieces instead. Kept for Q8/Q9 until redesigned. */
  watchedSquares?: import('../types').Position[];
  /** Scrolling world height (default 5). */
  boardHeight?: number;
  /** Scrolling world width (default 5). */
  boardWidth?: number;
  /** Axis of scrolling; omit for a fixed 5×5 board. */
  scrollAxis?: 'vertical' | 'horizontal';
};

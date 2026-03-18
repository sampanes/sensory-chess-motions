import { getValidMoves } from './moveCalculator';
import { PatrolPiece, PieceType, Position } from '../types';

const EMPTY_OBS = { fences: [], rivers: [], bridges: [], food: [] };

/**
 * Returns all squares threatened by one patrol piece at a specific step.
 * Reuses getValidMoves — valid moves from a position IS the threat zone.
 * Uses empty obstacles: sentinels phase through walls (their threat is vision, not presence).
 */
export function getSentinelThreat(
  patrol: PatrolPiece,
  stepIndex: number,
  boardRows: number,
  boardCols: number,
): Position[] {
  const pos = patrol.route[stepIndex % patrol.route.length];
  return getValidMoves(patrol.pieceType, pos, EMPTY_OBS, [], boardRows, boardCols);
}

/**
 * Returns the union of threat zones across all patrol pieces at their current steps.
 */
export function getAllThreats(
  patrols: PatrolPiece[],
  steps: number[],
  boardRows: number,
  boardCols: number,
): Position[] {
  return patrols.flatMap((p, i) =>
    getSentinelThreat(p, steps[i], boardRows, boardCols),
  );
}

/**
 * Returns true when every square the king at `kingPos` could move to is covered
 * by the combined threat zones of `patrols` + the player's own piece.
 *
 * PURE FUNCTION — no UI state. Safe to call from BoardShell, AdventureApp,
 * or any future checkmate-puzzle world (pass [] for patrols if no sentinels).
 *
 * Note: if the king has no valid moves at all (board-edge corner with no
 * neighbours), returns false — board-edge confinement alone doesn't count.
 */
export function isKingTrapped(
  kingPos: Position,
  playerPiece: PieceType,
  playerPos: Position,
  patrols: PatrolPiece[],
  steps: number[],
  boardRows: number,
  boardCols: number,
): boolean {
  const kingMoves = getValidMoves('king', kingPos, EMPTY_OBS, [], boardRows, boardCols);
  if (kingMoves.length === 0) return false;

  const playerThreats = getValidMoves(playerPiece, playerPos, EMPTY_OBS, [], boardRows, boardCols);
  const allThreats = [...playerThreats, ...getAllThreats(patrols, steps, boardRows, boardCols)];

  return kingMoves.every(sq =>
    allThreats.some(t => t.row === sq.row && t.col === sq.col),
  );
}

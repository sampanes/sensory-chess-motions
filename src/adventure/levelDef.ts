/**
 * Strip-based level format for scrolling worlds.
 *
 * Levels are defined as arrays of "strips" (rows for vertical worlds,
 * columns for horizontal worlds). Each strip is a 5-element array
 * describing the 5 cells along the fixed axis.
 *
 * Axis conventions:
 *   vertical   — world extends in rows (top = row 0, bottom = row N-1)
 *                Piece moves UP toward the goal. strips[0] = topmost row.
 *   horizontal — world extends in cols (left = col 0, right = col N-1)
 *                Piece moves RIGHT toward the goal. strips[0] = leftmost col.
 *
 * Cell shorthands:
 *   0          — empty grass
 *   'S'        — piece start position
 *   'G'        — goal (flag)
 *   'R'        — river (impassable)
 *   'B'        — bridge (river cell that can be crossed)
 *   'F'        — food item
 *   { ... }    — object form for fences and/or content (see CellObj)
 *
 * Fence sides use screen coordinates:
 *   fT = top edge, fB = bottom edge, fL = left edge, fR = right edge
 *
 * Examples:
 *   [0, 0, 'G', 0, 0]                  — goal at center of this strip
 *   [0, 'R', 'B', 'R', 0]             — river row with bridge at col 2
 *   [{ fB: true }, 0, 0, 0, 0]        — empty cell with fence on its bottom
 *   [{ is: 'F', fT: true }, 0, 0, 0, 0] — food cell with fence on its top
 */

import { Fence, Level, PieceType } from '../types';

// ─── Cell descriptor ────────────────────────────────────────────────────────

export type CellContent = 'S' | 'G' | 'R' | 'B' | 'F';

export type CellObj = {
  /** Cell content (omit for an empty cell with only fences). */
  is?: CellContent;
  /** Fence on the top edge of this cell. */
  fT?: true;
  /** Fence on the bottom edge of this cell. */
  fB?: true;
  /** Fence on the left edge of this cell. */
  fL?: true;
  /** Fence on the right edge of this cell. */
  fR?: true;
};

export type CellDef = 0 | CellContent | CellObj;

/** Five cells along the fixed axis of the world. */
export type Strip = [CellDef, CellDef, CellDef, CellDef, CellDef];

// ─── Scroll level definition ─────────────────────────────────────────────────

export type ScrollLevelDef = {
  name: string;
  description: string;
  hint?: string;
  pieceType: PieceType;
  /** Direction the world extends (and the piece moves toward the goal). */
  axis: 'vertical' | 'horizontal';
  starThresholds: { three: number; two: number };
  /**
   * For vertical:   strips[i] = row i (strips[0] = top/goal side).
   * For horizontal: strips[i] = col i (strips[0] = left/start side).
   *
   * Place 'S' (start) and 'G' (goal) wherever they belong in the strips.
   * The compiler scans them automatically.
   */
  strips: Strip[];
};

// ─── Compiler ────────────────────────────────────────────────────────────────

function cellContent(cell: CellDef): CellContent | undefined {
  if (cell === 0) return undefined;
  if (typeof cell === 'string') return cell;
  return cell.is;
}

function cellFences(cell: CellDef): Pick<CellObj, 'fT' | 'fB' | 'fL' | 'fR'> {
  if (typeof cell === 'object' && cell !== null && !Array.isArray(cell)) return cell;
  return {};
}

/**
 * Converts a strip-based level definition into a standard `Level` object
 * with `boardHeight`, `boardWidth`, and `scrollAxis` set.
 */
export function compileScrollLevel(def: ScrollLevelDef): Level {
  const fences: Fence[] = [];
  const rivers: { row: number; col: number }[] = [];
  const bridges: { row: number; col: number }[] = [];
  const food: { row: number; col: number }[] = [];
  let start: { row: number; col: number } | undefined;
  let goal: { row: number; col: number } | undefined;

  def.strips.forEach((strip, stripIdx) => {
    strip.forEach((cell, cellIdx) => {
      // Map strip/cell indices to world row/col
      const row = def.axis === 'vertical' ? stripIdx : cellIdx;
      const col = def.axis === 'vertical' ? cellIdx : stripIdx;

      const content = cellContent(cell);
      const { fT, fB, fL, fR } = cellFences(cell);

      if (content === 'S') start = { row, col };
      if (content === 'G') goal = { row, col };
      if (content === 'R') rivers.push({ row, col });
      if (content === 'B') {
        rivers.push({ row, col });
        bridges.push({ row, col });
      }
      if (content === 'F') food.push({ row, col });

      if (fT) fences.push({ row, col, side: 'top' });
      if (fB) fences.push({ row, col, side: 'bottom' });
      if (fL) fences.push({ row, col, side: 'left' });
      if (fR) fences.push({ row, col, side: 'right' });
    });
  });

  if (!start) throw new Error(`ScrollLevel "${def.name}": no 'S' (start) cell found.`);
  if (!goal) throw new Error(`ScrollLevel "${def.name}": no 'G' (goal) cell found.`);

  const boardHeight = def.axis === 'vertical' ? def.strips.length : 5;
  const boardWidth  = def.axis === 'horizontal' ? def.strips.length : 5;

  return {
    name: def.name,
    description: def.description,
    hint: def.hint,
    pieceType: def.pieceType,
    start,
    goal,
    starThresholds: def.starThresholds,
    obstacles: { fences, rivers, bridges, food },
    boardHeight,
    boardWidth,
    scrollAxis: def.axis,
  };
}

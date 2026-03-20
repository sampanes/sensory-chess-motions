import { PieceType, Position, PieceColor, GamePiece, ChessPhase, ChessGameState } from '../types';

const BOARD_SIZE = 5;

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function pieceAt(row: number, col: number, pieces: GamePiece[]): GamePiece | undefined {
  return pieces.find(p => p.position.row === row && p.position.col === col);
}

// Gardner's Minichess starting position
// Row 0 (black back rank): rook · knight · bishop · queen · king
// Row 1 (black pawns)
// Row 2 (empty)
// Row 3 (white pawns)
// Row 4 (white back rank): rook · knight · bishop · queen · king
export function buildInitialGameState(): ChessGameState {
  const pieces: GamePiece[] = [
    { id: 'b-rook',   color: 'black', pieceType: 'rook',   position: { row: 0, col: 0 } },
    { id: 'b-knight', color: 'black', pieceType: 'knight', position: { row: 0, col: 1 } },
    { id: 'b-bishop', color: 'black', pieceType: 'bishop', position: { row: 0, col: 2 } },
    { id: 'b-queen',  color: 'black', pieceType: 'queen',  position: { row: 0, col: 3 } },
    { id: 'b-king',   color: 'black', pieceType: 'king',   position: { row: 0, col: 4 } },
    { id: 'b-pawn-0', color: 'black', pieceType: 'pawn',   position: { row: 1, col: 0 }, hasMoved: false },
    { id: 'b-pawn-1', color: 'black', pieceType: 'pawn',   position: { row: 1, col: 1 }, hasMoved: false },
    { id: 'b-pawn-2', color: 'black', pieceType: 'pawn',   position: { row: 1, col: 2 }, hasMoved: false },
    { id: 'b-pawn-3', color: 'black', pieceType: 'pawn',   position: { row: 1, col: 3 }, hasMoved: false },
    { id: 'b-pawn-4', color: 'black', pieceType: 'pawn',   position: { row: 1, col: 4 }, hasMoved: false },
    { id: 'w-pawn-0', color: 'white', pieceType: 'pawn',   position: { row: 3, col: 0 }, hasMoved: false },
    { id: 'w-pawn-1', color: 'white', pieceType: 'pawn',   position: { row: 3, col: 1 }, hasMoved: false },
    { id: 'w-pawn-2', color: 'white', pieceType: 'pawn',   position: { row: 3, col: 2 }, hasMoved: false },
    { id: 'w-pawn-3', color: 'white', pieceType: 'pawn',   position: { row: 3, col: 3 }, hasMoved: false },
    { id: 'w-pawn-4', color: 'white', pieceType: 'pawn',   position: { row: 3, col: 4 }, hasMoved: false },
    { id: 'w-rook',   color: 'white', pieceType: 'rook',   position: { row: 4, col: 0 } },
    { id: 'w-knight', color: 'white', pieceType: 'knight', position: { row: 4, col: 1 } },
    { id: 'w-bishop', color: 'white', pieceType: 'bishop', position: { row: 4, col: 2 } },
    { id: 'w-queen',  color: 'white', pieceType: 'queen',  position: { row: 4, col: 3 } },
    { id: 'w-king',   color: 'white', pieceType: 'king',   position: { row: 4, col: 4 } },
  ];

  return {
    pieces,
    turn: 'white',
    phase: 'playing',
    selectedId: null,
    legalTargets: [],
  };
}

// All squares this piece could physically reach — no check filtering.
// Friendly pieces block; enemy pieces are capturable (land on them).
function getRawMoves(piece: GamePiece, pieces: GamePiece[]): Position[] {
  const { pieceType, color } = piece;
  const { row, col } = piece.position;
  const moves: Position[] = [];

  const isOwn   = (r: number, c: number) => pieceAt(r, c, pieces)?.color === color;
  const isEnemy = (r: number, c: number) => {
    const p = pieceAt(r, c, pieces);
    return p !== undefined && p.color !== color;
  };

  const slide = (dirs: { dr: number; dc: number }[]) => {
    for (const { dr, dc } of dirs) {
      let cr = row + dr, cc = col + dc;
      while (inBounds(cr, cc)) {
        if (isOwn(cr, cc)) break;
        moves.push({ row: cr, col: cc });
        if (isEnemy(cr, cc)) break; // capture — stop after landing
        cr += dr;
        cc += dc;
      }
    }
  };

  switch (pieceType as PieceType) {
    case 'queen':
      slide([
        { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
        { dr:  0, dc: -1 },                     { dr:  0, dc: 1 },
        { dr:  1, dc: -1 }, { dr:  1, dc: 0 }, { dr:  1, dc: 1 },
      ]);
      break;

    case 'rook':
      slide([{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }]);
      break;

    case 'bishop':
      slide([{ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 }]);
      break;

    case 'knight': {
      const jumps = [
        { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
        { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
        { dr:  1, dc: -2 }, { dr:  1, dc: 2 },
        { dr:  2, dc: -1 }, { dr:  2, dc: 1 },
      ];
      for (const { dr, dc } of jumps) {
        const nr = row + dr, nc = col + dc;
        if (inBounds(nr, nc) && !isOwn(nr, nc)) moves.push({ row: nr, col: nc });
      }
      break;
    }

    case 'king': {
      const dirs = [
        { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
        { dr:  0, dc: -1 },                     { dr:  0, dc: 1 },
        { dr:  1, dc: -1 }, { dr:  1, dc: 0 }, { dr:  1, dc: 1 },
      ];
      for (const { dr, dc } of dirs) {
        const nr = row + dr, nc = col + dc;
        if (inBounds(nr, nc) && !isOwn(nr, nc)) moves.push({ row: nr, col: nc });
      }
      break;
    }

    case 'pawn': {
      // White moves up (row -1), black moves down (row +1)
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 3 : 1;
      const nr1 = row + dir;

      // Forward one: only if square is empty
      if (inBounds(nr1, col) && !isOwn(nr1, col) && !isEnemy(nr1, col)) {
        moves.push({ row: nr1, col });
        // Forward two from starting rank: only if first square was also empty
        if (!piece.hasMoved && row === startRow) {
          const nr2 = row + dir * 2;
          if (inBounds(nr2, col) && !isOwn(nr2, col) && !isEnemy(nr2, col)) {
            moves.push({ row: nr2, col });
          }
        }
      }

      // Diagonal captures: only if an enemy occupies that square
      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (inBounds(nr1, nc) && isEnemy(nr1, nc)) {
          moves.push({ row: nr1, col: nc });
        }
      }
      break;
    }
  }

  return moves;
}

// True if `color`'s king is attacked by any opponent piece.
// Uses raw moves to avoid circular recursion with getLegalMoves.
export function isInCheck(color: PieceColor, pieces: GamePiece[]): boolean {
  const king = pieces.find(p => p.color === color && p.pieceType === 'king');
  if (!king) return false;
  const { row, col } = king.position;
  return pieces
    .filter(p => p.color !== color)
    .some(opp => getRawMoves(opp, pieces).some(m => m.row === row && m.col === col));
}

// Legal moves for a piece — raw moves filtered to exclude self-check.
function getLegalMovesFromPieces(piece: GamePiece, pieces: GamePiece[]): Position[] {
  return getRawMoves(piece, pieces).filter(target => {
    const next = applyPiecesMove(piece, target, pieces);
    return !isInCheck(piece.color, next);
  });
}

// Apply a move at the pieces level (no state — used internally and for check detection).
function applyPiecesMove(piece: GamePiece, to: Position, pieces: GamePiece[]): GamePiece[] {
  return pieces
    .filter(p => !(p.position.row === to.row && p.position.col === to.col && p.color !== piece.color))
    .map(p => p.id === piece.id ? { ...p, position: to, hasMoved: true } : p);
}

// Public: legal moves for a piece given the full game state.
export function getLegalMoves(piece: GamePiece, state: ChessGameState): Position[] {
  return getLegalMovesFromPieces(piece, state.pieces);
}

// Apply a move, returning the next full game state.
export function applyMove(from: Position, to: Position, state: ChessGameState): ChessGameState {
  const moving = pieceAt(from.row, from.col, state.pieces);
  if (!moving) return state;

  const captured = pieceAt(to.row, to.col, state.pieces);
  const newPieces = applyPiecesMove(moving, to, state.pieces);
  const nextTurn: PieceColor = state.turn === 'white' ? 'black' : 'white';
  const lastMove = { from, to, capturedId: captured?.id };

  // Pawn promotion: white reaches row 0, black reaches row 4.
  const promotionRow = moving.color === 'white' ? 0 : BOARD_SIZE - 1;
  if (moving.pieceType === 'pawn' && to.row === promotionRow) {
    return {
      pieces: newPieces,
      turn: nextTurn,
      phase: 'promotion',
      selectedId: null,
      legalTargets: [],
      lastMove,
      promotionSquare: to,
    };
  }

  const inCheck = isInCheck(nextTurn, newPieces);
  const hasLegal = newPieces
    .filter(p => p.color === nextTurn)
    .some(p => getLegalMovesFromPieces(p, newPieces).length > 0);

  let phase: ChessPhase;
  if (!hasLegal) {
    phase = inCheck ? 'checkmate' : 'stalemate';
  } else if (inCheck) {
    phase = 'check';
  } else {
    phase = 'playing';
  }

  return { pieces: newPieces, turn: nextTurn, phase, selectedId: null, legalTargets: [], lastMove };
}

/**
 * Resolve a pending promotion by replacing the pawn with the chosen piece,
 * then evaluating check/checkmate/stalemate for the side about to move.
 */
export function applyPromotion(chosenType: PieceType, state: ChessGameState): ChessGameState {
  const sq = state.promotionSquare;
  if (!sq) return state;

  // The promoting pawn belongs to the side that just moved (opposite of current turn).
  const promotingColor: PieceColor = state.turn === 'white' ? 'black' : 'white';
  const newPieces = state.pieces.map(p =>
    p.position.row === sq.row && p.position.col === sq.col && p.color === promotingColor
      ? { ...p, pieceType: chosenType }
      : p,
  );

  const nextTurn = state.turn;
  const inCheck = isInCheck(nextTurn, newPieces);
  const hasLegal = newPieces
    .filter(p => p.color === nextTurn)
    .some(p => getLegalMovesFromPieces(p, newPieces).length > 0);

  let phase: ChessPhase;
  if (!hasLegal) {
    phase = inCheck ? 'checkmate' : 'stalemate';
  } else if (inCheck) {
    phase = 'check';
  } else {
    phase = 'playing';
  }

  return { pieces: newPieces, turn: nextTurn, phase, selectedId: null, legalTargets: [], lastMove: state.lastMove };
}

// ─── Simple AI ────────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<PieceType, number> = {
  queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1, king: 0,
};

/**
 * Returns one legal move for the active side using a simple 1-ply greedy heuristic:
 * prefer captures by piece value, pick randomly among equals (and among non-captures).
 * Returns null if no moves exist (should not happen — caller checks phase first).
 */
export function getAIMove(state: ChessGameState): { from: Position; to: Position } | null {
  const { pieces, turn } = state;

  type Candidate = { from: Position; to: Position; score: number };
  const candidates: Candidate[] = [];

  for (const piece of pieces.filter(p => p.color === turn)) {
    for (const target of getLegalMovesFromPieces(piece, pieces)) {
      const captured = pieceAt(target.row, target.col, pieces);
      candidates.push({
        from: piece.position,
        to: target,
        score: captured ? PIECE_VALUE[captured.pieceType] : 0,
      });
    }
  }

  if (candidates.length === 0) return null;

  const maxScore = Math.max(...candidates.map(c => c.score));
  const best = candidates.filter(c => c.score === maxScore);
  return best[Math.floor(Math.random() * best.length)];
}

// Convenience exports for external use
export function isCheckmate(color: PieceColor, pieces: GamePiece[]): boolean {
  if (!isInCheck(color, pieces)) return false;
  return !pieces.filter(p => p.color === color).some(p => getLegalMovesFromPieces(p, pieces).length > 0);
}

export function isStalemate(color: PieceColor, pieces: GamePiece[]): boolean {
  if (isInCheck(color, pieces)) return false;
  return !pieces.filter(p => p.color === color).some(p => getLegalMovesFromPieces(p, pieces).length > 0);
}

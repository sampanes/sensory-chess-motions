import { motion } from 'framer-motion';
import { ChessPieceIcon } from './ChessPieceIcon';
import { GamePiece, Position, PieceColor, ChessPhase } from '../types';

// Classic chess board colours
const LIGHT_SQ = '#f0d9b5';
const DARK_SQ  = '#b58863';
// Pure invert → black body with white/light outline; drop-shadow pops off dark squares
const BLACK_FILTER = 'invert(1) drop-shadow(0 1px 2px rgba(255,255,255,0.35))';

interface FreePlayBoardProps {
  pieces: GamePiece[];
  selectedId: string | null;
  legalTargets: Position[];
  /** Id of an opponent piece the player tapped — its threat squares shown in red. */
  opponentPreviewId?: string | null;
  /** Squares the previewed opponent piece can move to (shown as red dots). */
  opponentTargets?: Position[];
  lastMove?: { from: Position; to: Position };
  turn: PieceColor;
  phase: ChessPhase;
  squareSize: number;
  onSquareClick: (row: number, col: number) => void;
}

const BOARD_SIZE = 5;

export function FreePlayBoard({
  pieces,
  selectedId,
  legalTargets,
  opponentPreviewId,
  opponentTargets,
  lastMove,
  turn,
  phase,
  squareSize,
  onSquareClick,
}: FreePlayBoardProps) {
  const boardPx = squareSize * BOARD_SIZE;

  function pieceAt(row: number, col: number): GamePiece | undefined {
    return pieces.find(p => p.position.row === row && p.position.col === col);
  }

  function isLegalTarget(row: number, col: number) {
    return legalTargets.some(t => t.row === row && t.col === col);
  }

  function isOpponentTarget(row: number, col: number) {
    return (opponentTargets ?? []).some(t => t.row === row && t.col === col);
  }

  function isLastMove(row: number, col: number) {
    return (
      (lastMove?.from.row === row && lastMove?.from.col === col) ||
      (lastMove?.to.row === row && lastMove?.to.col === col)
    );
  }

  function isSelected(row: number, col: number) {
    const p = pieceAt(row, col);
    return p?.id === selectedId;
  }

  // King in check — highlight its square
  const checkedKingPos = (phase === 'check' || phase === 'checkmate')
    ? pieces.find(p => p.color === turn && p.pieceType === 'king')?.position
    : null;

  return (
    <div
      className="rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
      style={{ width: boardPx, height: boardPx, position: 'relative' }}
    >
      {/* Cell grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_SIZE}, ${squareSize}px)`,
          width: boardPx,
          height: boardPx,
        }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
          const r = Math.floor(i / BOARD_SIZE);
          const c = i % BOARD_SIZE;
          const light = (r + c) % 2 === 0;
          const legalHere = isLegalTarget(r, c);
          const oppTargetHere = isOpponentTarget(r, c);
          const selectedHere = isSelected(r, c);
          const lastMoveHere = isLastMove(r, c);
          const checkHere = checkedKingPos?.row === r && checkedKingPos?.col === c;
          const piece = pieceAt(r, c);
          const isEnemy = piece && piece.color !== turn && legalHere;
          // Is this the opponent piece being previewed (tapped)?
          const opponentPreviewHere = piece?.id === opponentPreviewId;

          return (
            <div
              key={`${r}-${c}`}
              onClick={() => onSquareClick(r, c)}
              style={{
                width: squareSize,
                height: squareSize,
                background: light ? LIGHT_SQ : DARK_SQ,
                position: 'relative',
                cursor: piece ? 'pointer' : (legalHere ? 'pointer' : 'default'),
              }}
            >
              {/* Last-move amber tint */}
              {lastMoveHere && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(251,146,60,0.35)' }} />
              )}

              {/* Selected piece highlight */}
              {selectedHere && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(99,220,99,0.45)' }} />
              )}

              {/* Opponent piece preview highlight — red tint on tapped enemy */}
              {opponentPreviewHere && !selectedHere && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'rgba(239,68,68,0.3)' }} />
              )}

              {/* Check highlight — pulsing red on the king's square */}
              {checkHere && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.55, 0.85, 0.55] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: 'rgba(239,68,68,0.55)', boxShadow: 'inset 0 0 0 3px rgba(239,68,68,0.9)' }}
                />
              )}

              {/* Piece icon */}
              {piece && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <ChessPieceIcon
                    type={piece.pieceType}
                    size={squareSize * 0.82}
                    style={piece.color === 'black' ? { filter: BLACK_FILTER } : undefined}
                  />
                </div>
              )}

              {/* Legal target indicator (gold — player's own moves) */}
              {legalHere && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isEnemy ? (
                    // Enemy piece on a legal square — capture ring
                    <div style={{
                      position: 'absolute', inset: 3,
                      borderRadius: '50%',
                      border: '3px solid rgba(99,220,99,0.75)',
                      pointerEvents: 'none',
                    }} />
                  ) : (
                    // Empty legal square — gold dot
                    <div style={{
                      width: squareSize * 0.28,
                      height: squareSize * 0.28,
                      borderRadius: '50%',
                      background: 'rgba(99,220,99,0.65)',
                    }} />
                  )}
                </div>
              )}

              {/* Opponent threat indicator (red — squares the previewed enemy piece can reach) */}
              {oppTargetHere && !legalHere && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {piece && piece.color === turn ? (
                    // Own piece in the line of fire — red ring warning
                    <div style={{
                      position: 'absolute', inset: 3,
                      borderRadius: '50%',
                      border: '3px solid rgba(239,68,68,0.8)',
                      pointerEvents: 'none',
                    }} />
                  ) : (
                    // Empty square — red dot
                    <div style={{
                      width: squareSize * 0.28,
                      height: squareSize * 0.28,
                      borderRadius: '50%',
                      background: 'rgba(239,68,68,0.65)',
                    }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

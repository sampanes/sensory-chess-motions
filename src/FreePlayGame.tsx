import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGameState, Position, PieceType } from './types';
import {
  buildInitialGameState,
  getLegalMoves,
  applyMove,
  applyPromotion,
  getAIMove,
} from './utils/gameEngine';
import { FreePlayBoard } from './components/FreePlayBoard';
import { GameHUD } from './components/GameHUD';
import { GameOverScreen } from './components/GameOverScreen';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import {
  playMoveSound,
  playCrunchSound,
  playWompSound,
  playChessCheck,
  playChessCheckmate,
  playChessPromotion,
} from './utils/sounds';

function getSquareSize(): number {
  return Math.min(72, Math.floor((Math.min(window.innerWidth, window.innerHeight) - 48) / 5));
}

const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

function PromotionPicker({ squareSize, onChoose }: { squareSize: number; onChoose: (p: PieceType) => void }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', zIndex: 20, borderRadius: 8 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-white font-bold mb-3 text-sm tracking-wide">Your pawn promoted! Choose a piece:</p>
      <div className="flex gap-3">
        {PROMOTION_PIECES.map(pt => (
          <motion.button
            key={pt}
            onClick={() => onChoose(pt)}
            className="flex flex-col items-center gap-1"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 10,
              padding: 10,
              cursor: 'pointer',
              color: 'white',
            }}
            whileHover={{ scale: 1.12, background: 'rgba(255,255,255,0.22)' }}
            whileTap={{ scale: 0.96 }}
          >
            <ChessPieceIcon type={pt} size={squareSize * 0.72} />
            <span style={{ fontSize: 10, opacity: 0.75, textTransform: 'capitalize' }}>{pt}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function StoryBeat({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(to bottom, #1a1208, #2d1f0a)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onDismiss}
    >
      <div className="max-w-xs">
        <p className="text-amber-200 text-lg leading-relaxed mb-6">
          You know the rook. You know the bishop. You know the knight that jumps over everything in its way.
        </p>
        <p className="text-amber-200 text-lg leading-relaxed mb-6">
          You know the queen — all those lines, all that reach.
        </p>
        <p className="text-amber-200 text-lg leading-relaxed mb-6">
          And you know the king. Slow, careful, one step at a time.
        </p>
        <p className="text-amber-200 text-lg leading-relaxed mb-10">
          Now — for the first time — they're all on the same board. Both sides. Twelve pieces each.
        </p>
        <p className="text-amber-500 text-sm tracking-widest uppercase">Tap to begin</p>
      </div>
    </motion.div>
  );
}

export function FreePlayGame() {
  const [gameState, setGameState] = useState<ChessGameState>(buildInitialGameState);
  const [squareSize, setSquareSize] = useState(getSquareSize);
  const [opponentPreviewId, setOpponentPreviewId] = useState<string | null>(null);
  const [opponentTargets, setOpponentTargets] = useState<Position[]>([]);
  const [showStory, setShowStory] = useState(
    () => !localStorage.getItem('tbk_freeplay_seen')
  );
  const [showOrientation, setShowOrientation] = useState(
    () => !localStorage.getItem('tbk_freeplay_first_done')
  );

  // Recompute square size on resize
  useEffect(() => {
    const handler = () => setSquareSize(getSquareSize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Mark first game done when game ends
  useEffect(() => {
    if ((gameState.phase === 'checkmate' || gameState.phase === 'stalemate') && showOrientation) {
      localStorage.setItem('tbk_freeplay_first_done', '1');
      setShowOrientation(false);
    }
  }, [gameState.phase, showOrientation]);

  // AI plays black — fires after each state update where it's black's turn.
  // Also handles black pawn promotion: always promotes to queen.
  useEffect(() => {
    if (gameState.turn !== 'black') return;
    if (gameState.phase === 'checkmate' || gameState.phase === 'stalemate') return;
    // Clear any opponent preview when it's the AI's turn
    setOpponentPreviewId(null);
    setOpponentTargets([]);

    if (gameState.phase === 'promotion') {
      // Black promoted — auto-pick queen, then play sounds for resulting phase
      const t = setTimeout(() => {
        const newState = applyPromotion('queen', gameState);
        playChessPromotion();
        if (newState.phase === 'check') setTimeout(() => playChessCheck(), 350);
        else if (newState.phase === 'checkmate') setTimeout(() => playChessCheckmate(), 450);
        setGameState(newState);
      }, 300);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      const move = getAIMove(gameState);
      if (!move) return;
      const movingPiece = gameState.pieces.find(
        p => p.position.row === move.from.row && p.position.col === move.from.col,
      );
      const newState = applyMove(move.from, move.to, gameState);
      if (movingPiece) {
        playMoveSound(movingPiece.pieceType);
        if (newState.lastMove?.capturedId) playCrunchSound();
      }
      if (newState.phase === 'check')     setTimeout(() => playChessCheck(), 180);
      else if (newState.phase === 'checkmate') setTimeout(() => playChessCheckmate(), 280);
      else if (newState.phase === 'stalemate') setTimeout(() => playWompSound(), 280);
      setGameState(newState);
    }, 650);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turn, gameState.phase]);

  function handleDismissStory() {
    localStorage.setItem('tbk_freeplay_seen', '1');
    setShowStory(false);
  }

  function clearOpponentPreview() {
    setOpponentPreviewId(null);
    setOpponentTargets([]);
  }

  function handleSquareClick(row: number, col: number) {
    const { pieces, turn, phase, selectedId, legalTargets } = gameState;
    if (phase === 'checkmate' || phase === 'stalemate') return;
    if (phase === 'promotion') return; // awaiting promotion choice
    if (turn === 'black') return; // AI's turn — ignore player input

    const clickedPiece = pieces.find(p => p.position.row === row && p.position.col === col);

    if (selectedId) {
      // A piece is already selected — check if click is a legal destination
      if (legalTargets.some(t => t.row === row && t.col === col)) {
        const moving = pieces.find(p => p.id === selectedId)!;
        clearOpponentPreview();
        const newState = applyMove(moving.position, { row, col }, gameState);
        playMoveSound(moving.pieceType);
        if (newState.lastMove?.capturedId) playCrunchSound();
        if (newState.phase === 'check')          setTimeout(() => playChessCheck(), 180);
        else if (newState.phase === 'checkmate') setTimeout(() => playChessCheckmate(), 280);
        else if (newState.phase === 'stalemate') setTimeout(() => playWompSound(), 280);
        setGameState(newState);
        return;
      }

      // Clicking a different own piece switches selection
      if (clickedPiece && clickedPiece.color === turn) {
        clearOpponentPreview();
        const targets = getLegalMoves(clickedPiece, gameState);
        setGameState({ ...gameState, selectedId: clickedPiece.id, legalTargets: targets });
        return;
      }

      // Clicking an opponent piece — show its threat preview, deselect own piece
      if (clickedPiece && clickedPiece.color !== turn) {
        const targets = getLegalMoves(clickedPiece, gameState);
        setOpponentPreviewId(clickedPiece.id);
        setOpponentTargets(targets);
        setGameState({ ...gameState, selectedId: null, legalTargets: [] });
        return;
      }

      // Anything else: deselect
      clearOpponentPreview();
      setGameState({ ...gameState, selectedId: null, legalTargets: [] });
      return;
    }

    // Nothing selected — select an own piece or preview an opponent piece
    if (clickedPiece && clickedPiece.color === turn) {
      clearOpponentPreview();
      const targets = getLegalMoves(clickedPiece, gameState);
      setGameState({ ...gameState, selectedId: clickedPiece.id, legalTargets: targets });
      return;
    }

    if (clickedPiece && clickedPiece.color !== turn) {
      const targets = getLegalMoves(clickedPiece, gameState);
      setOpponentPreviewId(clickedPiece.id);
      setOpponentTargets(targets);
      setGameState({ ...gameState, selectedId: null, legalTargets: [] });
      return;
    }

    // Tapped empty square with no selection — clear everything
    clearOpponentPreview();
  }

  function handleReset() {
    clearOpponentPreview();
    setGameState(buildInitialGameState());
  }

  const { pieces, turn, phase, selectedId, legalTargets, lastMove } = gameState;
  const boardSize = squareSize * 5;

  return (
    <AnimatePresence mode="wait">
      {showStory ? (
        <StoryBeat key="story" onDismiss={handleDismissStory} />
      ) : (
        <motion.div
          key="game"
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(to bottom, #1a1208, #2d1f0a)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div style={{ width: boardSize }}>
            {/* Title */}
            <h1 className="text-center font-bold text-amber-200 mb-4 tracking-wide"
              style={{ fontSize: squareSize * 0.38 }}>
              The Borrowed Kingdom
            </h1>

            {/* HUD */}
            <GameHUD turn={turn} phase={phase} />

            {/* Orientation label — first game only */}
            <AnimatePresence>
              {showOrientation && (
                <motion.p
                  key="orientation"
                  className="text-center text-amber-400 text-xs mb-2 tracking-wide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.75 }}
                  exit={{ opacity: 0 }}
                >
                  You are White.&nbsp; The opponent plays Black.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Board + overlay */}
            <div style={{ position: 'relative' }}>
              <FreePlayBoard
                pieces={pieces}
                selectedId={selectedId}
                legalTargets={legalTargets}
                opponentPreviewId={opponentPreviewId}
                opponentTargets={opponentTargets}
                lastMove={lastMove}
                turn={turn}
                phase={phase}
                squareSize={squareSize}
                onSquareClick={handleSquareClick}
              />

              {phase === 'promotion' && (
                <PromotionPicker squareSize={squareSize} onChoose={choice => {
                  const newState = applyPromotion(choice, gameState);
                  playChessPromotion();
                  if (newState.phase === 'check')          setTimeout(() => playChessCheck(), 350);
                  else if (newState.phase === 'checkmate') setTimeout(() => playChessCheckmate(), 450);
                  setGameState(newState);
                }} />
              )}

              {(phase === 'checkmate' || phase === 'stalemate') && (
                <GameOverScreen
                  phase={phase}
                  loser={turn}
                  onPlayAgain={handleReset}
                />
              )}
            </div>

            {/* Subtle play-again during game */}
            {phase !== 'checkmate' && phase !== 'stalemate' && (
              <button
                onClick={handleReset}
                className="mt-3 w-full text-center text-amber-700 text-sm opacity-50 hover:opacity-80 transition-opacity"
              >
                ↺ Start over
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

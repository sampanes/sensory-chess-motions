import { useState, useEffect } from 'react';
import { ChessGameState } from './types';
import {
  buildInitialGameState,
  getLegalMoves,
  applyMove,
} from './utils/gameEngine';
import { FreePlayBoard } from './components/FreePlayBoard';
import { GameHUD } from './components/GameHUD';

function getSquareSize(): number {
  return Math.min(72, Math.floor((Math.min(window.innerWidth, window.innerHeight) - 48) / 5));
}

export function FreePlayGame() {
  const [gameState, setGameState] = useState<ChessGameState>(buildInitialGameState);
  const [squareSize, setSquareSize] = useState(getSquareSize);

  // Recompute square size on resize
  useEffect(() => {
    const handler = () => setSquareSize(getSquareSize());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function handleSquareClick(row: number, col: number) {
    const { pieces, turn, phase, selectedId, legalTargets } = gameState;
    if (phase === 'checkmate' || phase === 'stalemate') return;

    const clickedPiece = pieces.find(p => p.position.row === row && p.position.col === col);

    if (selectedId) {
      // A piece is already selected — check if click is a legal destination
      if (legalTargets.some(t => t.row === row && t.col === col)) {
        const moving = pieces.find(p => p.id === selectedId)!;
        setGameState(applyMove(moving.position, { row, col }, gameState));
        return;
      }

      // Clicking a different own piece switches selection
      if (clickedPiece && clickedPiece.color === turn) {
        const targets = getLegalMoves(clickedPiece, gameState);
        setGameState({ ...gameState, selectedId: clickedPiece.id, legalTargets: targets });
        return;
      }

      // Anything else: deselect
      setGameState({ ...gameState, selectedId: null, legalTargets: [] });
      return;
    }

    // Nothing selected — select an own piece
    if (clickedPiece && clickedPiece.color === turn) {
      const targets = getLegalMoves(clickedPiece, gameState);
      setGameState({ ...gameState, selectedId: clickedPiece.id, legalTargets: targets });
    }
  }

  function handleReset() {
    setGameState(buildInitialGameState());
  }

  const { pieces, turn, phase, selectedId, legalTargets, lastMove } = gameState;
  const boardSize = squareSize * 5;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(to bottom, #1a1208, #2d1f0a)' }}
    >
      <div style={{ width: boardSize }}>
        {/* Title */}
        <h1 className="text-center font-bold text-amber-200 mb-4 tracking-wide"
          style={{ fontSize: squareSize * 0.38 }}>
          The Borrowed Kingdom
        </h1>

        {/* HUD */}
        <GameHUD turn={turn} phase={phase} />

        {/* Board */}
        <FreePlayBoard
          pieces={pieces}
          selectedId={selectedId}
          legalTargets={legalTargets}
          lastMove={lastMove}
          turn={turn}
          phase={phase}
          squareSize={squareSize}
          onSquareClick={handleSquareClick}
        />

        {/* Game-over banner */}
        {(phase === 'checkmate' || phase === 'stalemate') && (
          <div
            className="mt-4 rounded-xl p-4 text-center"
            style={{ background: 'rgba(30,20,10,0.90)' }}
          >
            <p className="text-amber-100 font-bold text-lg mb-1">
              {phase === 'checkmate'
                ? `${turn === 'white' ? 'Black' : 'White'} wins — Checkmate.`
                : 'Stalemate — it\'s a draw.'}
            </p>
            <p className="text-amber-400 text-sm mb-3">
              {phase === 'checkmate'
                ? 'The king is trapped. It has nowhere left to go.'
                : 'The king can\'t move, but was never in danger.'}
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2 rounded-lg font-bold text-amber-900"
              style={{ background: '#f5e6c8' }}
            >
              Play again
            </button>
          </div>
        )}

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
    </div>
  );
}

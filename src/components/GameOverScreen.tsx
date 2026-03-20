import { motion } from 'framer-motion';
import { ChessPieceIcon } from './ChessPieceIcon';
import { ChessPhase, PieceColor } from '../types';

interface GameOverScreenProps {
  phase: ChessPhase;
  /** The side that just lost (was checkmated / stalemated) */
  loser: PieceColor;
  onPlayAgain: () => void;
}

export function GameOverScreen({ phase, loser, onPlayAgain }: GameOverScreenProps) {
  const winner = loser === 'white' ? 'black' : 'white';
  const BLACK_FILTER = 'invert(0.92)';

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
      style={{ background: 'rgba(10,6,2,0.82)', zIndex: 20 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {phase === 'checkmate' ? (
        <>
          <div style={{ filter: winner === 'black' ? BLACK_FILTER : undefined, marginBottom: 12 }}>
            <ChessPieceIcon type="king" size={64} />
          </div>
          <p className="font-bold text-amber-100 text-2xl mb-1">Checkmate.</p>
          <p className="text-amber-300 text-sm mb-6">The king has nowhere to go.</p>
        </>
      ) : (
        <>
          <div className="flex gap-3 mb-3">
            <ChessPieceIcon type="king" size={48} />
            <div style={{ filter: BLACK_FILTER }}>
              <ChessPieceIcon type="king" size={48} />
            </div>
          </div>
          <p className="font-bold text-amber-100 text-2xl mb-1">Stalemate.</p>
          <p className="text-amber-300 text-sm text-center mb-1 px-4">
            The king can't move — but was never in check.
          </p>
          <p className="text-amber-400 text-sm mb-6">It's a draw.</p>
        </>
      )}

      <button
        onClick={onPlayAgain}
        className="px-8 py-2 rounded-lg font-bold text-amber-900"
        style={{ background: '#f5e6c8' }}
      >
        Play again
      </button>
    </motion.div>
  );
}

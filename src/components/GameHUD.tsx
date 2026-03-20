import { motion, AnimatePresence } from 'framer-motion';
import { ChessPieceIcon } from './ChessPieceIcon';
import { PieceColor, ChessPhase } from '../types';

const BLACK_FILTER = 'invert(0.92)';

interface GameHUDProps {
  turn: PieceColor;
  phase: ChessPhase;
}

export function GameHUD({ turn, phase }: GameHUDProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 rounded-xl mb-3"
      style={{ background: 'rgba(30,20,10,0.75)' }}>

      {/* Active side indicator */}
      <div className="flex items-center gap-2">
        <ChessPieceIcon
          type="king"
          size={28}
          style={turn === 'black' ? { filter: BLACK_FILTER } : undefined}
        />
        <span className="font-bold text-lg" style={{ color: turn === 'white' ? '#f5e6c8' : '#c8c8c8' }}>
          {turn === 'white' ? 'White' : 'Black'}
        </span>
      </div>

      {/* Check badge */}
      <AnimatePresence>
        {phase === 'check' && (
          <motion.span
            key="check"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="font-bold text-sm px-3 py-1 rounded-full"
            style={{ background: 'rgba(239,68,68,0.85)', color: '#fff' }}
          >
            Check!
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

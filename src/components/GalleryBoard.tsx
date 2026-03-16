/**
 * GalleryBoard — an 8×8 board that showcases all six piece types.
 *
 * Tap any piece to see its full move range (computed on an empty board).
 * Valid-move circles are tinted with that piece's world colour.
 * A small memory label names the piece and its movement style.
 * "Continue →" appears once all six piece types have been tapped, or after 20 s.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceType, Position } from '../types';
import { ChessPieceIcon } from './ChessPieceIcon';
import { getValidMoves } from '../utils/moveCalculator';

// ─── Static data ──────────────────────────────────────────────────────────────

const EMPTY_OBSTACLES = { fences: [], rivers: [], bridges: [], food: [] };

/** One piece of each type placed for good visual demonstrations. */
const GALLERY_PIECES: { type: PieceType; row: number; col: number }[] = [
  { type: 'rook',   row: 7, col: 0 },
  { type: 'knight', row: 7, col: 1 },
  { type: 'bishop', row: 7, col: 2 },
  { type: 'queen',  row: 7, col: 3 },
  { type: 'king',   row: 7, col: 4 },
  { type: 'pawn',   row: 6, col: 4 },
];

const PIECE_INFO: Record<PieceType, { color: string; label: string; memory: string }> = {
  king:   { color: '#f59e0b', label: 'King',   memory: 'One step in any direction' },
  pawn:   { color: '#22c55e', label: 'Pawn',   memory: 'Forward — one step at a time' },
  rook:   { color: '#64748b', label: 'Rook',   memory: 'Slides along ranks and files' },
  bishop: { color: '#8b5cf6', label: 'Bishop', memory: 'Glides on the diagonals' },
  knight: { color: '#475569', label: 'Knight', memory: 'Leaps in an L-shape, over anything' },
  queen:  { color: '#a855f7', label: 'Queen',  memory: 'Every direction, any distance' },
};

const ALL_TYPES: PieceType[] = ['king', 'pawn', 'rook', 'bishop', 'knight', 'queen'];

// ─── Component ────────────────────────────────────────────────────────────────

interface GalleryBoardProps {
  squareSize: number;
  onDone: () => void;
}

export function GalleryBoard({ squareSize, onDone }: GalleryBoardProps) {
  const [selected, setSelected] = useState<{ type: PieceType; row: number; col: number } | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [tappedTypes, setTappedTypes] = useState<Set<PieceType>>(new Set());
  const [showContinue, setShowContinue] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reveal "Continue" after 20 s regardless of progress
  useEffect(() => {
    timerRef.current = setTimeout(() => setShowContinue(true), 20_000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handlePieceClick = (piece: { type: PieceType; row: number; col: number }) => {
    // Toggle deselect
    if (selected?.type === piece.type && selected.row === piece.row && selected.col === piece.col) {
      setSelected(null);
      setValidMoves([]);
      return;
    }

    setSelected(piece);
    const moves = getValidMoves(
      piece.type,
      { row: piece.row, col: piece.col },
      EMPTY_OBSTACLES,
      [],
      8, 8,
    );
    setValidMoves(moves);

    const next = new Set(tappedTypes);
    next.add(piece.type);
    setTappedTypes(next);

    if (ALL_TYPES.every(t => next.has(t))) {
      setTimeout(() => setShowContinue(true), 500);
    }
  };

  const boardPx = squareSize * 8;
  const info = selected ? PIECE_INFO[selected.type] : null;

  return (
    <div className="flex flex-col items-center gap-3">

      {/* Info label */}
      <div className="min-h-[2.5rem] flex items-center justify-center px-4">
        <AnimatePresence mode="wait">
          {info ? (
            <motion.div
              key={selected!.type}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center"
            >
              <span className="font-bold text-base" style={{ color: info.color }}>
                {info.label}
              </span>
              <span className="text-sm text-gray-600 ml-2">{info.memory}</span>
            </motion.div>
          ) : (
            <motion.p
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-500 italic"
            >
              Tap a piece to see how it moves
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{ width: boardPx, height: boardPx }}
      >
        {/* Squares */}
        <div
          className="grid absolute inset-0"
          style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}
        >
          {Array.from({ length: 64 }, (_, i) => {
            const r = Math.floor(i / 8);
            const c = i % 8;
            const light = (r + c) % 2 === 0;
            const isValid = validMoves.some(m => m.row === r && m.col === c);
            const dotColor = info?.color ?? '#fbbf24';

            return (
              <div
                key={`${r}-${c}`}
                className={`relative ${light ? 'bg-amber-100' : 'bg-amber-800'}`}
                style={{ width: squareSize, height: squareSize }}
              >
                {isValid && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width:  squareSize * 0.42,
                        height: squareSize * 0.42,
                        background: dotColor,
                        opacity: 0.72,
                        boxShadow: `0 0 8px ${dotColor}`,
                      }}
                    />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pieces */}
        {GALLERY_PIECES.map(piece => {
          const isSelected = selected?.type === piece.type
            && selected.row === piece.row
            && selected.col === piece.col;
          const wasTapped = tappedTypes.has(piece.type);
          const pInfo = PIECE_INFO[piece.type];

          return (
            <motion.div
              key={`${piece.type}`}
              className="absolute flex items-center justify-center cursor-pointer z-[4]"
              style={{
                width:  squareSize,
                height: squareSize,
                left:   piece.col * squareSize,
                top:    piece.row * squareSize,
              }}
              animate={isSelected ? { scale: 1.15 } : { scale: 1 }}
              onClick={() => handlePieceClick(piece)}
            >
              <motion.div
                animate={
                  isSelected
                    ? { filter: `drop-shadow(0 0 10px ${pInfo.color})` }
                    : wasTapped
                    ? { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3)) brightness(0.8)' }
                    : { filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }
                }
              >
                <ChessPieceIcon type={piece.type} size={squareSize * 0.72} />
              </motion.div>

              {/* Tiny coloured dot on already-tapped pieces */}
              {wasTapped && !isSelected && (
                <div
                  className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-white"
                  style={{ background: pInfo.color }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress dots — one per piece type */}
      <div className="flex gap-2">
        {ALL_TYPES.map(t => (
          <div
            key={t}
            className="w-2.5 h-2.5 rounded-full border border-gray-300 transition-all duration-300"
            style={
              tappedTypes.has(t)
                ? { background: PIECE_INFO[t].color, borderColor: PIECE_INFO[t].color }
                : { background: '#e5e7eb' }
            }
          />
        ))}
      </div>

      {/* Continue button */}
      <AnimatePresence>
        {showContinue && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg cursor-pointer"
            onClick={onDone}
          >
            Continue →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

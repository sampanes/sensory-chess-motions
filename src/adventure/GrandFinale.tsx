/**
 * Milestone 25 — The Grand Finale.
 *
 * Scene 1: "You Know This Board" — full starting chess position, stagger
 *   animation, tap any white piece to see its name + world memory + valid moves.
 * Scene 2: "The Final Move" — a one-move tactic (rook captures unprotected queen).
 * Scene 3: Ending — story beat + "Keep exploring" / "Play real chess".
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPieceIcon } from '../components/ChessPieceIcon';
import { PieceType, Position } from '../types';
import { getValidMoves } from '../utils/moveCalculator';

// ─── Shared data ──────────────────────────────────────────────────────────────

const PIECE_COLORS: Record<PieceType, string> = {
  king:   '#f59e0b',
  pawn:   '#22c55e',
  rook:   '#64748b',
  bishop: '#8b5cf6',
  knight: '#3b82f6',
  queen:  '#a855f7',
};

const PIECE_MEMORIES: Record<PieceType, string> = {
  king:   "You met the king at The King's Start.",
  pawn:   "You met the pawn at Pawn's Farm.",
  rook:   "You met the rook at Rook's Roads.",
  bishop: "You met the bishop at Bishop's Grove.",
  knight: "You met the knight at Knight's Mountains.",
  queen:  "You met the queen at Queen's Realm.",
};

const EMPTY_OBS = { fences: [], rivers: [], bridges: [], food: [] };

// ─── Gallery data (full starting chess position) ──────────────────────────────

type GalleryPiece = {
  row: number; col: number;
  type: PieceType;
  isBlack: boolean;
  staggerIndex: number;
};

function buildStartingPosition(): GalleryPiece[] {
  const pieces: GalleryPiece[] = [];
  let idx = 0;
  const backRank: PieceType[] = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

  // White back rank (row 7) first
  backRank.forEach((type, col) => {
    pieces.push({ row: 7, col, type, isBlack: false, staggerIndex: idx++ });
  });
  // White pawns (row 6)
  for (let col = 0; col < 8; col++) {
    pieces.push({ row: 6, col, type: 'pawn', isBlack: false, staggerIndex: idx++ });
  }
  // Black pawns (row 1)
  for (let col = 0; col < 8; col++) {
    pieces.push({ row: 1, col, type: 'pawn', isBlack: true, staggerIndex: idx++ });
  }
  // Black back rank (row 0)
  backRank.forEach((type, col) => {
    pieces.push({ row: 0, col, type, isBlack: true, staggerIndex: idx++ });
  });
  return pieces;
}

const GALLERY_PIECES = buildStartingPosition();

// ─── Puzzle data ──────────────────────────────────────────────────────────────

const PUZZLE_WHITE_OTHERS = [
  { row: 3, col: 4, type: 'knight' as PieceType },
  { row: 6, col: 0, type: 'pawn'   as PieceType },
  { row: 6, col: 2, type: 'pawn'   as PieceType },
  { row: 6, col: 5, type: 'pawn'   as PieceType },
  { row: 7, col: 4, type: 'king'   as PieceType },
];

const PUZZLE_BLACK_PIECES = [
  { row: 0, col: 2, type: 'king'  as PieceType },
  { row: 1, col: 2, type: 'pawn'  as PieceType },
  { row: 1, col: 5, type: 'pawn'  as PieceType },
  { row: 5, col: 4, type: 'pawn'  as PieceType },
  { row: 4, col: 6, type: 'queen' as PieceType }, // ← the target
];

const ROOK_START: Position = { row: 4, col: 0 };
const WIN_SQUARE: Position = { row: 4, col: 6 };

// ─── Root component ───────────────────────────────────────────────────────────

type FinalePhase = 'gallery' | 'puzzle' | 'ending';

export function GrandFinale({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<FinalePhase>('gallery');
  return (
    <AnimatePresence mode="wait">
      {phase === 'gallery' && (
        <GalleryScene key="gallery" onContinue={() => setPhase('puzzle')} onBack={onBack} />
      )}
      {phase === 'puzzle' && (
        <PuzzleScene key="puzzle" onWin={() => setPhase('ending')} />
      )}
      {phase === 'ending' && (
        <EndingScene key="ending" onKeepExploring={onComplete} />
      )}
    </AnimatePresence>
  );
}

// ─── Scene 1: Gallery ─────────────────────────────────────────────────────────

function GalleryScene({
  onContinue,
  onBack,
}: {
  onContinue: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<GalleryPiece | null>(null);
  const [tappedTypes, setTappedTypes] = useState<Set<PieceType>>(new Set());
  const [canContinue, setCanContinue] = useState(false);

  // Valid moves from selected piece's position on an empty 8×8 board
  const validMoves: Position[] = selected
    ? getValidMoves(selected.type, { row: selected.row, col: selected.col }, EMPTY_OBS, [], 8, 8)
    : [];

  // Unlock continue after all 6 piece types tapped
  useEffect(() => {
    if (tappedTypes.size >= 6) setCanContinue(true);
  }, [tappedTypes]);

  // Fallback: show Continue after 20s regardless
  useEffect(() => {
    const t = setTimeout(() => setCanContinue(true), 20_000);
    return () => clearTimeout(t);
  }, []);

  const sqSize = Math.min(46, Math.floor((Math.min(window.innerWidth, 400) - 16) / 8));

  const handleTap = (piece: GalleryPiece) => {
    if (piece.isBlack) return;
    setSelected(piece);
    setTappedTypes(prev => new Set([...prev, piece.type]));
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center gap-4 p-4"
      style={{ background: 'linear-gradient(to bottom, #1c1c2e, #1e1b4b, #312e81)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-3xl mb-1">♟️</div>
        <h2 className="text-xl font-extrabold text-white mb-1">You Know This Board</h2>
        <p className="text-white/55 text-sm">Tap any piece to see where it can go.</p>
      </motion.div>

      {/* 8×8 board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${sqSize}px)`,
          gridTemplateRows:    `repeat(8, ${sqSize}px)`,
          border: '2px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          const piece = GALLERY_PIECES.find(p => p.row === row && p.col === col);
          const isSelected = selected?.row === row && selected?.col === col;
          const isValid = validMoves.some(m => m.row === row && m.col === col);
          const hlColor = selected ? PIECE_COLORS[selected.type] : '#fff';

          return (
            <div
              key={i}
              onClick={() => piece && handleTap(piece)}
              style={{
                width: sqSize, height: sqSize,
                background: isSelected
                  ? `${hlColor}55`
                  : isValid
                    ? `${hlColor}33`
                    : isLight ? '#f0d9b5' : '#b58863',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: piece && !piece.isBlack ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {/* Valid-move dot */}
              {isValid && !piece && (
                <div style={{
                  width: sqSize * 0.3, height: sqSize * 0.3,
                  borderRadius: '50%',
                  background: hlColor, opacity: 0.65,
                }} />
              )}

              {/* Piece */}
              {piece && (
                <motion.div
                  initial={{ scale: 0, y: -10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: piece.isBlack ? 0.42 : 1 }}
                  transition={{ delay: piece.staggerIndex * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
                  style={{ filter: piece.isBlack ? 'brightness(0.35) sepia(0.4)' : undefined }}
                >
                  <ChessPieceIcon type={piece.type} size={sqSize * 0.76} />
                </motion.div>
              )}

              {/* Selected glow ring */}
              {isSelected && (
                <div style={{
                  position: 'absolute', inset: 2,
                  border: `2px solid ${hlColor}`,
                  borderRadius: 3,
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Info panel */}
      <div style={{ minHeight: 64, width: '100%', maxWidth: 320 }}>
        <AnimatePresence mode="wait">
          {selected && !selected.isBlack && (
            <motion.div
              key={`${selected.row}-${selected.col}-${selected.type}`}
              className="rounded-2xl px-5 py-3 text-center"
              style={{
                background: `${PIECE_COLORS[selected.type]}22`,
                border: `1px solid ${PIECE_COLORS[selected.type]}55`,
              }}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{ opacity: 0, y: -6,   scale: 0.95 }}
            >
              <div
                className="font-extrabold capitalize text-lg"
                style={{ color: PIECE_COLORS[selected.type] }}
              >
                {selected.type === 'king'   ? 'The King'   :
                 selected.type === 'queen'  ? 'The Queen'  :
                 selected.type === 'rook'   ? 'The Rook'   :
                 selected.type === 'bishop' ? 'The Bishop' :
                 selected.type === 'knight' ? 'The Knight' :
                                             'The Pawn'}
              </div>
              <div className="text-white/65 text-sm mt-0.5">{PIECE_MEMORIES[selected.type]}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress indicator */}
      {!canContinue && (
        <motion.div
          className="flex gap-2 items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          {(['king','queen','rook','bishop','knight','pawn'] as PieceType[]).map(pt => (
            <div
              key={pt}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: tappedTypes.has(pt) ? PIECE_COLORS[pt] : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Continue button */}
      <AnimatePresence>
        {canContinue && (
          <motion.button
            onClick={onContinue}
            className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-lg py-3 px-8 rounded-2xl shadow-lg cursor-pointer"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
          >
            Continue →
          </motion.button>
        )}
      </AnimatePresence>

      <button
        onClick={onBack}
        className="text-white/35 text-sm cursor-pointer bg-transparent border-none"
      >
        ← Back to map
      </button>
    </motion.div>
  );
}

// ─── Scene 2: Puzzle ──────────────────────────────────────────────────────────

function PuzzleScene({ onWin }: { onWin: () => void }) {
  const [rookPos, setRookPos] = useState<Position>(ROOK_START);
  const [captured, setCaptured] = useState<Set<string>>(new Set());
  const [won, setWon] = useState(false);

  const sqSize = Math.min(46, Math.floor((Math.min(window.innerWidth, 400) - 16) / 8));

  const liveBlack = PUZZLE_BLACK_PIECES.filter(p => !captured.has(`${p.row},${p.col}`));

  const obstacles = {
    ...EMPTY_OBS,
    rivers: PUZZLE_WHITE_OTHERS.map(p => ({ row: p.row, col: p.col })),
  };

  const validMoves = getValidMoves(
    'rook',
    rookPos,
    obstacles,
    liveBlack.map(p => ({ row: p.row, col: p.col })),
    8,
    8,
  );

  const handleClick = (row: number, col: number) => {
    if (won) return;
    if (!validMoves.some(m => m.row === row && m.col === col)) return;

    const capturedPiece = liveBlack.find(p => p.row === row && p.col === col);
    if (capturedPiece) {
      setCaptured(prev => new Set([...prev, `${capturedPiece.row},${capturedPiece.col}`]));
    }

    setRookPos({ row, col });

    if (row === WIN_SQUARE.row && col === WIN_SQUARE.col) {
      setTimeout(() => {
        setWon(true);
        setTimeout(onWin, 1800);
      }, 350);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center gap-5 p-4"
      style={{ background: 'linear-gradient(to bottom, #1c1c2e, #0f172a, #020617)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-3xl mb-1">🎯</div>
        <h2 className="text-xl font-extrabold text-white mb-1">The Final Move</h2>
        <p className="text-white/65 text-sm max-w-xs">
          One of your pieces can take something. Find it.
        </p>
      </motion.div>

      {/* Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, ${sqSize}px)`,
          gridTemplateRows:    `repeat(8, ${sqSize}px)`,
          border: '2px solid rgba(255,255,255,0.18)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {Array.from({ length: 64 }, (_, i) => {
          const row = Math.floor(i / 8);
          const col = i % 8;
          const isLight = (row + col) % 2 === 0;
          const isRook = rookPos.row === row && rookPos.col === col;
          const whiteOther = PUZZLE_WHITE_OTHERS.find(p => p.row === row && p.col === col);
          const blackPiece = liveBlack.find(p => p.row === row && p.col === col);
          const isValid = validMoves.some(m => m.row === row && m.col === col);
          const isCapture = isValid && !!blackPiece;

          return (
            <div
              key={i}
              onClick={() => handleClick(row, col)}
              style={{
                width: sqSize, height: sqSize,
                background: isRook
                  ? 'rgba(100,116,139,0.35)'
                  : isCapture
                    ? 'rgba(239,68,68,0.28)'
                    : isValid
                      ? 'rgba(148,163,184,0.18)'
                      : isLight ? '#f0d9b5' : '#b58863',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isValid ? 'pointer' : 'default',
                position: 'relative',
              }}
            >
              {/* Valid-move dot */}
              {isValid && !isRook && !blackPiece && (
                <div style={{
                  width: sqSize * 0.28, height: sqSize * 0.28,
                  borderRadius: '50%',
                  background: 'rgba(148,163,184,0.65)',
                }} />
              )}

              {/* Rook */}
              {isRook && (
                <ChessPieceIcon type="rook" size={sqSize * 0.76} />
              )}

              {/* Other white pieces */}
              {!isRook && whiteOther && (
                <ChessPieceIcon type={whiteOther.type} size={sqSize * 0.76} />
              )}

              {/* Black pieces */}
              {blackPiece && (
                <div style={{ filter: 'brightness(0.35) sepia(0.5)', opacity: 0.72 }}>
                  <ChessPieceIcon type={blackPiece.type} size={sqSize * 0.76} />
                </div>
              )}

              {/* Capture-square highlight ring */}
              {isCapture && (
                <div style={{
                  position: 'absolute', inset: 0,
                  border: '2px solid rgba(239,68,68,0.65)',
                  borderRadius: 2,
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Win message */}
      <AnimatePresence>
        {won && (
          <motion.div
            className="text-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <div className="text-5xl mb-2">✨</div>
            <p className="text-white font-bold text-xl">The queen is yours.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Scene 3: Ending ──────────────────────────────────────────────────────────

function EndingScene({ onKeepExploring }: { onKeepExploring: () => void }) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: 'linear-gradient(to bottom, #1c1c2e, #1e1b4b, #312e81)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Falling stars */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-xl select-none pointer-events-none"
          style={{ left: `${(i * 13 + 5) % 100}vw` }}
          initial={{ y: -60, opacity: 0.8 }}
          animate={{ y: '105vh', opacity: [0.8, 0.8, 0] }}
          transition={{ duration: 4 + (i % 3), delay: i * 0.4, repeat: Infinity, ease: 'linear' }}
        >
          {['⭐','✨','🌟','♟️','👑','⭐','✨','🌟'][i]}
        </motion.div>
      ))}

      <motion.div
        className="relative z-10 max-w-sm"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <motion.div
          className="text-6xl mb-5 select-none"
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ delay: 1, duration: 2, repeat: Infinity, repeatDelay: 3.5 }}
        >
          ♟️
        </motion.div>

        <motion.h2
          className="text-2xl font-extrabold text-white mb-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          You&apos;ve been learning chess all along.
        </motion.h2>

        <motion.div
          className="rounded-2xl p-6 text-left space-y-3 mb-6"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <p className="text-white/88 text-base leading-relaxed">
            You started with a little king who didn&apos;t know where to go.
          </p>
          <p className="text-white/88 text-base leading-relaxed">
            Now look at what you can see.
          </p>
          <p className="text-white/88 text-base leading-relaxed">
            Every piece. Every path. Every threat.
          </p>
          <p className="text-amber-300 font-bold text-base">
            This is chess. You&apos;ve been playing it all along.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3">
          <motion.button
            onClick={onKeepExploring}
            className="w-full bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
          >
            Keep exploring 🗺️
          </motion.button>

          <motion.div
            className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <p className="text-white/80 text-sm font-semibold">Play real chess ♟️</p>
            <p className="text-white/50 text-xs mt-1">
              Ask a grown-up to set up a chess board for you.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

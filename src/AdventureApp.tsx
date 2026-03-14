import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { BoardShell } from './components/BoardShell';
import { Level, Food, Position } from './types';

type AdventurePhase = 'title' | 'placeholder';

const SCRATCH_KING_LEVEL: Level = {
  name: 'The Little King',
  description: 'One step at a time — reach the flag!',
  hint: 'The king can step in any of 8 directions.',
  pieceType: 'king',
  start: { row: 4, col: 2 },
  goal: { row: 0, col: 2 },
  starThresholds: { three: 4, two: 6 },
  obstacles: { fences: [], rivers: [], bridges: [], food: [] },
};

export default function AdventureApp() {
  const [phase, setPhase] = useState<AdventurePhase>('title');

  if (phase === 'title') {
    return <TitleScreen onBegin={() => setPhase('placeholder')} />;
  }

  return <PlaceholderScreen onBack={() => setPhase('title')} />;
}

// ---------------------------------------------------------------------------
// Emoji landscape data — each row has a y%, font size, opacity, and emoji set.
// Rows near the top (horizon) are small and faint; foreground rows are large
// and vivid, creating a simple depth-of-field illusion without any images.
// ---------------------------------------------------------------------------
const LANDSCAPE_ROWS = [
  {
    top: '26%',
    size: 9,
    opacity: 0.28,
    emojis: ['🏔️', '🌲', '⛰️', '🌲', '🏔️', '🌲', '⛰️', '🌲', '🏔️'],
  },
  {
    top: '38%',
    size: 13,
    opacity: 0.42,
    emojis: ['🌲', '🌳', '🌲', '🌳', '🌲', '🌳', '🌲', '🌳', '🌲'],
  },
  {
    top: '50%',
    size: 19,
    opacity: 0.60,
    emojis: ['🌳', '🌾', '🌼', '🌳', '🌸', '🌾', '🌼', '🌳', '🌸'],
  },
  {
    top: '63%',
    size: 26,
    opacity: 0.78,
    emojis: ['🌿', '🍀', '🌺', '🌻', '🌺', '🍀', '🌿', '🌻', '🌺'],
  },
  {
    top: '76%',
    size: 36,
    opacity: 1,
    emojis: ['🌱', '🍄', '🌻', '🌼', '🌻', '🍄', '🌱', '🌼', '🍄'],
  },
] as const;

function TitleScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center select-none"
      style={{
        background:
          'linear-gradient(to bottom, #29b6f6 0%, #81d4fa 20%, #b3e5fc 40%, #c8e6c9 58%, #66bb6a 75%, #2e7d32 100%)',
      }}
    >
      {/* Parallax emoji landscape */}
      {LANDSCAPE_ROWS.map((row, ri) => (
        <div
          key={ri}
          className="absolute w-full flex justify-around items-end pointer-events-none"
          style={{ top: row.top, opacity: row.opacity }}
        >
          {row.emojis.map((e, i) => (
            <span key={i} style={{ fontSize: row.size, lineHeight: 1 }}>
              {e}
            </span>
          ))}
        </div>
      ))}

      {/* Title card */}
      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* King — gentle idle bob */}
        <motion.div
          className="mb-5 flex justify-center drop-shadow-2xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChessPieceIcon type="king" size={80} />
        </motion.div>

        <h1
          className="text-5xl font-extrabold text-white mb-2 leading-tight"
          style={{ textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
        >
          The Friendship Kingdom
        </h1>

        <p
          className="text-lg font-semibold mb-10"
          style={{ color: 'rgba(255,255,255,0.82)', textShadow: '0 1px 6px rgba(0,0,0,0.2)' }}
        >
          A Chess Adventure
        </p>

        <motion.button
          onClick={onBegin}
          className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-2xl py-5 px-14 rounded-3xl shadow-2xl cursor-pointer"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          Begin ✨
        </motion.button>
      </motion.div>

      {/* Back to Classic */}
      <motion.a
        href="/"
        className="absolute bottom-6 left-6 text-sm font-medium"
        style={{ color: 'rgba(255,255,255,0.65)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        onPointerEnter={e => (e.currentTarget.style.color = '#fff')}
        onPointerLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
      >
        ← Back to Classic
      </motion.a>
    </div>
  );
}

function PlaceholderScreen({ onBack }: { onBack: () => void }) {
  const [consumedFood, setConsumedFood] = useState<Food[]>([]);
  const [trail, setTrail] = useState<Position[]>([SCRATCH_KING_LEVEL.start]);
  const [moveCount, setMoveCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const [won, setWon] = useState(false);

  const squareSize = 64;

  const handleMove = (newPos: Position) => {
    setTrail(prev => [...prev, newPos]);
    setMoveCount(c => c + 1);
    if (newPos.row === SCRATCH_KING_LEVEL.goal.row && newPos.col === SCRATCH_KING_LEVEL.goal.col) {
      setWon(true);
    }
  };

  const handleReset = () => {
    setConsumedFood([]);
    setTrail([SCRATCH_KING_LEVEL.start]);
    setMoveCount(0);
    setWon(false);
    setResetCount(c => c + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-green-100 flex flex-col items-center justify-center gap-5 p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-700">Adventure Demo Board</h2>
      <p className="text-gray-500 text-sm">BoardShell wired into AdventureApp ✅</p>

      <BoardShell
        key={`adventure-${resetCount}`}
        level={SCRATCH_KING_LEVEL}
        consumedFood={consumedFood}
        trail={trail}
        squareSize={squareSize}
        isMobile={false}
        onMove={handleMove}
        onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
        onStuck={() => {}}
      />

      {won && (
        <motion.p
          className="text-green-600 font-bold text-xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          🎉 You did it in {moveCount} moves!
        </motion.p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="text-amber-700 font-semibold border border-amber-300 rounded-xl px-4 py-2 hover:bg-amber-100 cursor-pointer bg-white text-sm"
        >
          ↺ Reset
        </button>
        <button
          onClick={onBack}
          className="text-gray-500 font-semibold hover:underline cursor-pointer bg-transparent border-none text-sm"
        >
          ← Back to Title
        </button>
      </div>
    </div>
  );
}

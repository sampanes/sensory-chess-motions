import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { BoardShell } from './components/BoardShell';
import { ScrollBoard } from './components/ScrollBoard';
import { Food, Level, Position } from './types';
import { act1KingLevels } from './adventure/levels/king';

type AdventurePhase = 'title' | 'act1';

export default function AdventureApp() {
  const [phase, setPhase] = useState<AdventurePhase>('title');

  if (phase === 'title') {
    return <TitleScreen onBegin={() => setPhase('act1')} />;
  }
  return <Act1Flow onBack={() => setPhase('title')} />;
}

// ---------------------------------------------------------------------------
// Act 1 — linear level sequence
// ---------------------------------------------------------------------------
type Act1Phase = 'intro' | 'playing' | 'celebration' | 'story' | 'done';

function getStars(thresholds: { three: number; two: number }, moves: number): number {
  if (moves <= thresholds.three) return 3;
  if (moves <= thresholds.two) return 2;
  return 1;
}

function Act1Flow({ onBack }: { onBack: () => void }) {
  const [act1Phase, setAct1Phase] = useState<Act1Phase>('intro');
  const [levelIndex, setLevelIndex] = useState(0);
  const [consumedFood, setConsumedFood] = useState<Food[]>([]);
  const [trail, setTrail] = useState<Position[]>([act1KingLevels[0].start]);
  const [moveCount, setMoveCount] = useState(0);
  const [resetCount, setResetCount] = useState(0);
  const [lastStars, setLastStars] = useState(0);

  const level: Level = act1KingLevels[levelIndex];
  const isLastLevel = levelIndex === act1KingLevels.length - 1;

  const startLevel = () => {
    setConsumedFood([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setAct1Phase('playing');
  };

  const resetBoard = () => {
    setConsumedFood([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
  };

  const handleMove = (newPos: Position) => {
    setTrail(prev => [...prev, newPos]);
    const next = moveCount + 1;
    setMoveCount(next);
    if (newPos.row === level.goal.row && newPos.col === level.goal.col) {
      setLastStars(getStars(level.starThresholds, next));
      setTimeout(() => setAct1Phase('celebration'), 600);
    }
  };

  const handleNext = () => {
    if (isLastLevel) {
      setAct1Phase('story');
    } else {
      const next = levelIndex + 1;
      setLevelIndex(next);
      setConsumedFood([]);
      setTrail([act1KingLevels[next].start]);
      setMoveCount(0);
      setResetCount(c => c + 1);
      setAct1Phase('intro');
    }
  };

  // ---- Intro ----
  if (act1Phase === 'intro') {
    const isFirst = levelIndex === 0;
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-emerald-100 to-amber-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          key={levelIndex}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-sm w-full"
        >
          <motion.div
            className="mb-5 flex justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChessPieceIcon type="king" size={70} />
          </motion.div>

          <div className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">
            Level {levelIndex + 1} of {act1KingLevels.length}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{level.name}</h2>
          <p className="text-base text-gray-600 mb-4">{level.description}</p>

          {level.hint && (
            <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3 mb-6 text-sm text-sky-800">
              💡 {level.hint}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
            <span className="font-semibold">3 ★</span> in {level.starThresholds.three} move{level.starThresholds.three !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold">2 ★</span> in {level.starThresholds.two}
          </div>

          <motion.button
            onClick={startLevel}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFirst ? "Let's Go! 🌟" : 'Play! 🌟'}
          </motion.button>

          <button
            onClick={onBack}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Back to Title
          </button>
        </motion.div>
      </div>
    );
  }

  // ---- Playing ----
  if (act1Phase === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-200 via-emerald-100 to-amber-50 flex flex-col items-center justify-center gap-4 p-4 select-none">
        <motion.div
          className="text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-0.5">
            Level {levelIndex + 1} · {level.name}
          </div>
          <motion.span
            className="text-sm font-bold text-gray-700"
            key={moveCount}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {moveCount} move{moveCount !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        {level.scrollAxis ? (
          <ScrollBoard
            key={`act1-${levelIndex}-${resetCount}`}
            level={level}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={72}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={() => {}}
          />
        ) : (
          <BoardShell
            key={`act1-${levelIndex}-${resetCount}`}
            level={level}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={72}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={() => {}}
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={resetBoard}
            className="text-sm text-gray-500 border border-gray-300 rounded-xl px-4 py-2 hover:bg-white cursor-pointer bg-white/60"
          >
            ↺ Restart
          </button>
          <button
            onClick={() => setAct1Phase('intro')}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Level Info
          </button>
        </div>
      </div>
    );
  }

  // ---- Celebration ----
  if (act1Phase === 'celebration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 via-amber-100 to-orange-100 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            initial={{ x: `${(i * 8.3) % 100}vw`, y: -60 }}
            animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 1.2, repeat: Infinity, ease: 'linear' }}
          >
            {['⭐', '🎉', '✨', '🌟', '🎊', '💛'][i % 6]}
          </motion.div>
        ))}

        <motion.div
          className="relative z-10 max-w-sm w-full"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-1">
            {lastStars === 3 ? 'Perfect!' : lastStars === 2 ? 'Well done!' : 'You made it!'}
          </h2>
          <p className="text-gray-600 mb-4">
            Reached the flag in <span className="font-bold text-amber-600">{moveCount}</span> move{moveCount !== 1 ? 's' : ''}.
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3].map(s => (
              <motion.div
                key={s}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: s <= lastStars ? 1 : 0.5, rotate: 0, opacity: s <= lastStars ? 1 : 0.25 }}
                transition={{ delay: 0.3 + s * 0.15, type: 'spring', stiffness: 300 }}
              >
                <Star className={`w-12 h-12 ${s <= lastStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={handleNext}
              className="bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {isLastLevel ? 'Finish the Chapter ✨' : 'Next Level →'}
            </motion.button>

            {lastStars < 3 && (
              <motion.button
                onClick={startLevel}
                className="text-sky-600 font-semibold hover:underline cursor-pointer bg-transparent border-none text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                ↺ Try for 3 stars
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- Story beat after A5 ----
  if (act1Phase === 'story') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-100 via-orange-50 to-sky-100 flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          className="max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            className="text-6xl mb-6"
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            👑
          </motion.div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-4">The Kingdom Is Broken</h2>

          <div className="bg-white/70 rounded-2xl p-6 shadow-md text-gray-700 text-base leading-relaxed mb-6 text-left space-y-3">
            <p>
              The king walked through the quiet fields of his kingdom. The old stone walls stood, but so much else had crumbled.
            </p>
            <p>
              He was alone — but not entirely. Beyond the meadow, he could hear them.
            </p>
            <p className="font-semibold text-amber-700 italic">
              "The Pawn folk are out there," he thought. "And they need help."
            </p>
          </div>

          <motion.button
            onClick={() => setAct1Phase('done')}
            className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-xl py-4 px-10 rounded-2xl shadow-lg cursor-pointer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Continue →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ---- Done / Chapter End ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 via-emerald-100 to-amber-50 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        className="max-w-sm"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
      >
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Chapter 1 Complete!</h2>
        <p className="text-gray-600 mb-2">You've explored the Little King's world.</p>

        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 my-6 text-amber-800">
          <div className="text-2xl mb-2">🌾</div>
          <p className="font-semibold">Coming next: Pawn's Farm</p>
          <p className="text-sm mt-1 text-amber-600">Help the Pawns make their way across the fields.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              setLevelIndex(0);
              setAct1Phase('intro');
            }}
            className="text-sm text-gray-500 border border-gray-300 rounded-xl px-4 py-2 hover:bg-white cursor-pointer bg-white/60"
          >
            ↺ Play Act 1 again
          </button>
          <button
            onClick={onBack}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Back to Title
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Title screen
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

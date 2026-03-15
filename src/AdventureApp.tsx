import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { BoardShell } from './components/BoardShell';
import { ScrollBoard } from './components/ScrollBoard';
import { WorldMap } from './WorldMap';
import { Roster } from './Roster';
import { TrialMode } from './TrialMode';
import { Food, Level, Position } from './types';
import {
  WORLDS,
  WORLD_LEVELS,
  loadProgress,
  markWorldComplete,
  getUnlockedWorlds,
  AdventureProgress,
} from './adventure/worlds';

// Register all world levels (side-effect import)
import './adventure/levels/index';

// ─── Dad Cheat — URL param helpers ───────────────────────────────────────────
// ?adventure&dadcheat               — all worlds unlocked, trials skipped
// ?adventure&dadcheat&world=2       — jump straight into world 2
// ?adventure&dadcheat&world=2&level=5 — jump to world 2, level 5 (1-indexed)

const _params = new URLSearchParams(window.location.search);
const IS_DAD_CHEAT    = _params.has('dadcheat');
const DAD_CHEAT_WORLD = _params.has('world')  ? Math.max(0, parseInt(_params.get('world')!,  10)) : null;
const DAD_CHEAT_LEVEL = _params.has('level')  ? Math.max(1, parseInt(_params.get('level')!,  10)) - 1 : 0;

// ─── Top-level phase ──────────────────────────────────────────────────────────

type AppPhase = 'title' | 'worldMap' | 'playWorld';

export default function AdventureApp() {
  const [phase, setPhase] = useState<AppPhase>(() => {
    if (IS_DAD_CHEAT && DAD_CHEAT_WORLD !== null) return 'playWorld';
    if (IS_DAD_CHEAT) return 'worldMap'; // skip title, land on unlocked map
    return 'title';
  });

  const [selectedWorld, setSelectedWorld] = useState(() =>
    IS_DAD_CHEAT && DAD_CHEAT_WORLD !== null ? DAD_CHEAT_WORLD : 0
  );

  const [progress, setProgress] = useState<AdventureProgress>(loadProgress);

  const unlockedWorlds = IS_DAD_CHEAT
    ? WORLDS.map(w => w.id)
    : getUnlockedWorlds(progress.completedWorlds);

  const handleSelectWorld = (worldId: number) => {
    setSelectedWorld(worldId);
    setPhase('playWorld');
  };

  const handleWorldComplete = (worldId: number) => {
    const updated = markWorldComplete(worldId);
    setProgress(updated);
    setPhase('worldMap');
  };

  if (phase === 'title') {
    return <TitleScreen onBegin={() => setPhase('worldMap')} />;
  }

  if (phase === 'worldMap') {
    return (
      <WorldMap
        completedWorlds={progress.completedWorlds}
        unlockedWorlds={unlockedWorlds}
        onSelectWorld={handleSelectWorld}
        onBack={() => setPhase('title')}
      />
    );
  }

  return (
    <WorldPlay
      worldId={selectedWorld}
      completedWorlds={progress.completedWorlds}
      initialLevelIndex={IS_DAD_CHEAT ? DAD_CHEAT_LEVEL : 0}
      skipTrial={IS_DAD_CHEAT}
      onComplete={() => handleWorldComplete(selectedWorld)}
      onBack={() => setPhase('worldMap')}
    />
  );
}

// ─── WorldPlay ────────────────────────────────────────────────────────────────

type PlayPhase = 'intro' | 'playing' | 'celebration' | 'trial' | 'story' | 'done';

function getStars(thresholds: { three: number; two: number }, moves: number): number {
  if (moves <= thresholds.three) return 3;
  if (moves <= thresholds.two)   return 2;
  return 1;
}

function WorldPlay({
  worldId,
  completedWorlds,
  initialLevelIndex,
  skipTrial,
  onComplete,
  onBack,
}: {
  worldId: number;
  completedWorlds: number[];
  initialLevelIndex: number;
  skipTrial: boolean;
  onComplete: () => void;
  onBack: () => void;
}) {
  const world  = WORLDS[worldId];
  const levels: Level[] = WORLD_LEVELS[worldId] ?? [];

  const [playPhase, setPlayPhase] = useState<PlayPhase>('intro');
  const [levelIndex, setLevelIndex] = useState(() =>
    Math.min(initialLevelIndex, Math.max(0, levels.length - 1))
  );
  const [consumedFood, setConsumedFood] = useState<Food[]>([]);
  const [trail,        setTrail]        = useState<Position[]>([levels[levelIndex]?.start ?? { row: 0, col: 0 }]);
  const [moveCount,    setMoveCount]    = useState(0);
  const [resetCount,   setResetCount]   = useState(0);
  const [lastStars,    setLastStars]    = useState(0);

  const level: Level = levels[levelIndex];
  const isLastLevel  = levelIndex === levels.length - 1;

  const startLevel = () => {
    setConsumedFood([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setPlayPhase('playing');
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
      setTimeout(() => setPlayPhase('celebration'), 600);
    }
  };

  const handleNext = () => {
    if (isLastLevel) {
      // Last level done: skip trial for dad cheat, otherwise run it
      setPlayPhase(skipTrial ? 'story' : 'trial');
    } else {
      const next = levelIndex + 1;
      setLevelIndex(next);
      setConsumedFood([]);
      setTrail([levels[next].start]);
      setMoveCount(0);
      setResetCount(c => c + 1);
      setPlayPhase('intro');
    }
  };

  // ── Intro card ──
  if (playPhase === 'intro') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          key={`intro-${levelIndex}`}
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
            <ChessPieceIcon type={level.pieceType} size={70} />
          </motion.div>

          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: world.palette.accent }}>
            {world.name} · Level {levelIndex + 1} of {levels.length}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{level.name}</h2>
          <p className="text-base text-gray-600 mb-4">{level.description}</p>

          {level.hint && (
            <div className="bg-white/60 border-2 border-sky-200 rounded-xl p-3 mb-4 text-sm text-sky-800">
              💡 {level.hint}
            </div>
          )}

          <div className="bg-white/50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
            <span className="font-semibold">3 ★</span> in {level.starThresholds.three} move{level.starThresholds.three !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold">2 ★</span> in {level.starThresholds.two}
          </div>

          {/* Dad cheat level-jump controls */}
          {skipTrial && (
            <div className="flex gap-2 justify-center mb-4">
              <button
                onClick={() => {
                  const prev = Math.max(0, levelIndex - 1);
                  setLevelIndex(prev);
                  setConsumedFood([]);
                  setTrail([levels[prev].start]);
                  setMoveCount(0);
                  setResetCount(c => c + 1);
                }}
                disabled={levelIndex === 0}
                className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 hover:bg-white cursor-pointer bg-white/40 disabled:opacity-30"
              >
                ◀ Prev level
              </button>
              <span className="text-xs text-gray-400 self-center">
                👨 {levelIndex + 1}/{levels.length}
              </span>
              <button
                onClick={() => {
                  const next = Math.min(levels.length - 1, levelIndex + 1);
                  setLevelIndex(next);
                  setConsumedFood([]);
                  setTrail([levels[next].start]);
                  setMoveCount(0);
                  setResetCount(c => c + 1);
                }}
                disabled={levelIndex === levels.length - 1}
                className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 hover:bg-white cursor-pointer bg-white/40 disabled:opacity-30"
              >
                Next level ▶
              </button>
            </div>
          )}

          <motion.button
            onClick={startLevel}
            className="w-full text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            {levelIndex === 0 ? "Let's Go! 🌟" : 'Play! 🌟'}
          </motion.button>

          <button
            onClick={onBack}
            className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← World Map
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Playing ──
  if (playPhase === 'playing') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 select-none"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: world.palette.accent }}>
            {level.name}
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
            key={`world${worldId}-${levelIndex}-${resetCount}`}
            level={level}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={72}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={() => {}}
            showCheckerboard={worldId === 3}
          />
        ) : (
          <BoardShell
            key={`world${worldId}-${levelIndex}-${resetCount}`}
            level={level}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={72}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={() => {}}
            showCheckerboard={worldId === 3}
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
            onClick={() => setPlayPhase('intro')}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Level Info
          </button>
        </div>
      </div>
    );
  }

  // ── Celebration ──
  if (playPhase === 'celebration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 via-amber-100 to-orange-100 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            style={{ left: `${(i * 8.5) % 100}vw` }}
            initial={{ y: -120, opacity: 1 }}
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

  // ── Trial ──
  if (playPhase === 'trial') {
    return (
      <TrialMode
        worldId={worldId}
        onPass={() => setPlayPhase('story')}
        onSkip={() => setPlayPhase('story')}
      />
    );
  }

  // ── Story beat ──
  if (playPhase === 'story') {
    const story = world.story;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: world.palette.bg }}
      >
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
            {world.emoji}
          </motion.div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-4">{story.title}</h2>

          <div className="bg-white/70 rounded-2xl p-6 shadow-md text-gray-700 text-base leading-relaxed mb-6 text-left space-y-3">
            {story.paragraphs.map((para, i) => (
              <p key={i} className={i === story.paragraphs.length - 1 ? 'font-semibold italic' : ''}>
                {para}
              </p>
            ))}
          </div>

          <motion.button
            onClick={() => setPlayPhase('done')}
            className="text-white font-bold text-xl py-4 px-10 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Continue →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Done / chapter end ──
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ background: world.palette.bg }}
    >
      <motion.div
        className="max-w-sm"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180 }}
      >
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{world.name} Complete!</h2>
        <p className="text-gray-600 mb-4">
          You've explored <span className="font-semibold">{world.name}</span>. Well done!
        </p>

        <div className="mb-2">
          <Roster completedWorlds={[...completedWorlds, worldId]} />
        </div>

        {world.story.nextTeaser && (
          <div className="bg-white/60 border-2 border-white/40 rounded-2xl p-5 my-5 text-gray-800">
            <div className="text-2xl mb-2">{world.story.nextTeaserEmoji}</div>
            <p className="font-semibold">Coming next: {world.story.nextTeaser}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <motion.button
            onClick={onComplete}
            className="text-white font-bold text-lg py-3 px-8 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to World Map 🗺️
          </motion.button>

          <button
            onClick={() => {
              setLevelIndex(0);
              setPlayPhase('intro');
            }}
            className="text-sm text-gray-500 border border-gray-300 rounded-xl px-4 py-2 hover:bg-white cursor-pointer bg-white/60"
          >
            ↺ Play again
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Title screen ─────────────────────────────────────────────────────────────

const LANDSCAPE_ROWS = [
  { top: '26%', size: 9,  opacity: 0.28, emojis: ['🏔️', '🌲', '⛰️', '🌲', '🏔️', '🌲', '⛰️', '🌲', '🏔️'] },
  { top: '38%', size: 13, opacity: 0.42, emojis: ['🌲', '🌳', '🌲', '🌳', '🌲', '🌳', '🌲', '🌳', '🌲'] },
  { top: '50%', size: 19, opacity: 0.60, emojis: ['🌳', '🌾', '🌼', '🌳', '🌸', '🌾', '🌼', '🌳', '🌸'] },
  { top: '63%', size: 26, opacity: 0.78, emojis: ['🌿', '🍀', '🌺', '🌻', '🌺', '🍀', '🌿', '🌻', '🌺'] },
  { top: '76%', size: 36, opacity: 1,    emojis: ['🌱', '🍄', '🌻', '🌼', '🌻', '🍄', '🌱', '🌼', '🍄'] },
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
      {LANDSCAPE_ROWS.map((row, ri) => (
        <div
          key={ri}
          className="absolute w-full flex justify-around items-end pointer-events-none"
          style={{ top: row.top, opacity: row.opacity }}
        >
          {row.emojis.map((e, i) => (
            <span key={i} style={{ fontSize: row.size, lineHeight: 1 }}>{e}</span>
          ))}
        </div>
      ))}

      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
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

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Flag,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  Trophy,
  Star,
  ChevronLeft,
  SkipBack,
  Map,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Position, GamePhase, PieceType } from './types';
import { levels } from './levels';
import { getValidMoves, isValidMove } from './utils/moveCalculator';
import { ChessPieceIcon } from './components/ChessPieceIcon';

const BOARD_SIZE = 5;
const SQUARE_SIZE = 88;

type CompletionRecord = {
  bestMoves: number;
  bestStars: number;
};

function pieceEmoji(type: PieceType) {
  switch (type) {
    case 'rook':
      return '🏰';
    case 'bishop':
      return '⛪';
    case 'knight':
      return '🐴';
  }
}

function pieceName(type: PieceType) {
  switch (type) {
    case 'rook':
      return 'Rook';
    case 'bishop':
      return 'Bishop';
    case 'knight':
      return 'Knight';
  }
}

function pieceDescription(type: PieceType) {
  switch (type) {
    case 'rook':
      return 'Slides straight — up, down, left, right';
    case 'bishop':
      return 'Slides diagonally — corner to corner';
    case 'knight':
      return 'Jumps in a 2-and-1 L-shape — over anything!';
  }
}

function getDecoration(r: number, c: number): string | null {
  const hash = (r * 7 + c * 13) % 20;
  if (hash === 3) return '🌱';
  if (hash === 7) return '🌼';
  if (hash === 11) return '🍀';
  if (hash === 15) return '🌿';
  return null;
}

function getStarsForLevel(levelIndex: number, moves: number) {
  const thresholds = levels[levelIndex].starThresholds;
  if (moves <= thresholds.three) return 3;
  if (moves <= thresholds.two) return 2;
  return 1;
}

function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [piecePos, setPiecePos] = useState<Position>(levels[0].start);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [trail, setTrail] = useState<Position[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<Record<number, CompletionRecord>>({});
  const [lastRunStars, setLastRunStars] = useState(0);

  const level = levels[levelIndex];

  const initLevel = useCallback((idx: number) => {
    const lv = levels[idx];
    setPiecePos(lv.start);
    setValidMoves([]);
    setMoveCount(0);
    setShowHint(false);
    setTrail([lv.start]);
    setAnimKey(prev => prev + 1);
  }, []);

  const openLevel = useCallback(
    (idx: number, nextPhase: GamePhase = 'intro') => {
      setLevelIndex(idx);
      initLevel(idx);
      setPhase(nextPhase);
    },
    [initLevel]
  );

  const handleStart = () => {
    setPhase('playing');
    initLevel(levelIndex);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (phase !== 'playing') return;

    if (!isValidMove(validMoves, row, col)) return;

    const newPos = { row, col };
    const nextMoveCount = moveCount + 1;

    setPiecePos(newPos);
    setMoveCount(nextMoveCount);
    setTrail(prev => [...prev, newPos]);
    setAnimKey(prev => prev + 1);

    if (row === level.goal.row && col === level.goal.col) {
      const earnedStars = getStarsForLevel(levelIndex, nextMoveCount);
      setLastRunStars(earnedStars);
      setValidMoves([]);
      setCompletedLevels(prev => {
        const existing = prev[levelIndex];
        const updated: CompletionRecord = existing
          ? {
              bestMoves: Math.min(existing.bestMoves, nextMoveCount),
              bestStars: Math.max(existing.bestStars, earnedStars),
            }
          : {
              bestMoves: nextMoveCount,
              bestStars: earnedStars,
            };
        return { ...prev, [levelIndex]: updated };
      });
      setUnlockedLevel(prev => Math.max(prev, Math.min(levelIndex + 1, levels.length - 1)));
      setTimeout(() => {
        setPhase('celebration');
      }, 600);
    }
  };

  useEffect(() => {
    if (phase === 'playing') {
      setValidMoves(getValidMoves(level.pieceType, piecePos, level.obstacles));
    }
  }, [phase, piecePos, level.pieceType, level.obstacles]);

  const handleNext = () => {
    if (levelIndex + 1 < levels.length) {
      openLevel(levelIndex + 1, 'intro');
    } else {
      setPhase('allDone');
    }
  };

  const handleReset = () => {
    initLevel(levelIndex);
  };

  const handleRetryLevel = () => {
    openLevel(levelIndex, 'playing');
  };

  const totalStars = useMemo(() => {
    return Object.values(completedLevels).reduce((sum, record) => sum + record.bestStars, 0);
  }, [completedLevels]);

  const completedCount = useMemo(() => Object.keys(completedLevels).length, [completedLevels]);

  const progressData = useMemo(() => {
    return levels.map((lv, i) => ({
      pieceType: lv.pieceType,
      isCurrent: i === levelIndex,
      isCompleted: !!completedLevels[i],
      isUnlocked: i <= unlockedLevel,
      stars: completedLevels[i]?.bestStars ?? 0,
    }));
  }, [levelIndex, completedLevels, unlockedLevel]);

  const isRiver = (r: number, c: number) => level.obstacles.rivers.some(rv => rv.row === r && rv.col === c);
  const isBridge = (r: number, c: number) => level.obstacles.bridges.some(b => b.row === r && b.col === c);
  const isGoal = (r: number, c: number) => level.goal.row === r && level.goal.col === c;
  const isTrail = (r: number, c: number) => trail.some(t => t.row === r && t.col === c);
  const hasFence = (r: number, c: number, side: string) =>
    level.obstacles.fences.some(f => f.row === r && f.col === c && f.side === side);
  const isValid = (r: number, c: number) => validMoves.some(m => m.row === r && m.col === c);
  const isPiece = (r: number, c: number) => piecePos.row === r && piecePos.col === c;

  const getSquareClasses = (r: number, c: number) => {
    if (isRiver(r, c) && !isBridge(r, c)) return 'bg-blue-400';
    if (isRiver(r, c) && isBridge(r, c)) return 'bg-amber-500';
    const light = (r + c) % 2 === 0;
    return light ? 'bg-emerald-200' : 'bg-emerald-400';
  };

  const ProgressBar = () => (
    <div className="flex items-center gap-1">
      {progressData.map((p, i) => (
        <div key={i} className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              p.isCompleted
                ? 'bg-green-400 shadow-sm shadow-green-300'
                : p.isCurrent
                ? 'bg-yellow-400 shadow-sm shadow-yellow-300 scale-125'
                : p.isUnlocked
                ? 'bg-sky-300'
                : 'bg-gray-300'
            }`}
            title={`Level ${i + 1}: ${levels[i].name}`}
          />
          {i < progressData.length - 1 && (
            <div className={`w-2 h-0.5 ${i < unlockedLevel ? 'bg-green-300' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const LevelPicker = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={`bg-white/85 backdrop-blur-sm border border-white/70 rounded-2xl shadow-lg ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold text-sm">
        <Map className="w-4 h-4" />
        Choose a Level
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-auto pr-1">
        {levels.map((lv, i) => {
          const record = completedLevels[i];
          const locked = i > unlockedLevel;
          return (
            <button
              key={lv.id}
              onClick={() => !locked && openLevel(i, 'intro')}
              disabled={locked}
              className={`rounded-xl border p-2 text-left transition-all ${
                locked
                  ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : i === levelIndex
                  ? 'bg-yellow-50 border-yellow-300 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-sky-300 hover:bg-sky-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">#{lv.id}</span>
                {locked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : record ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : null}
              </div>
              <div className="text-xs font-semibold text-gray-700 truncate">{lv.name}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{pieceEmoji(lv.pieceType)}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(star => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        record && star <= record.bestStars
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (phase === 'intro') {
    const isNewPiece = levelIndex === 0 || levels[levelIndex - 1]?.pieceType !== level.pieceType;
    const record = completedLevels[levelIndex];

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-200 flex items-center justify-center p-4">
        <motion.div
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-4xl w-full"
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          key={levelIndex}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start mb-5">
                <ProgressBar />
              </div>

              {isNewPiece ? (
                <motion.div
                  className="mb-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <div className="inline-block bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl p-5 border-2 border-amber-200 shadow-lg mb-3">
                    <motion.div
                      animate={{ rotate: [0, -8, 8, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <ChessPieceIcon type={level.pieceType} size={72} />
                    </motion.div>
                  </div>
                  <h2 className="text-xl font-bold text-amber-700 mb-1">Meet the {pieceName(level.pieceType)}!</h2>
                  <p className="text-sm text-amber-600">{pieceDescription(level.pieceType)}</p>
                </motion.div>
              ) : (
                <motion.div
                  className="text-5xl mb-3"
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  {pieceEmoji(level.pieceType)}
                </motion.div>
              )}

              <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">
                  Level {level.id} of {levels.length}
                </span>
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>

              <h1 className="text-3xl font-extrabold text-gray-800 mb-2">{level.name}</h1>
              <p className="text-lg text-gray-600 mb-4">{level.description}</p>

              <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4 mb-4 text-left">
                <p className="text-sm font-semibold text-sky-800 mb-1">💡 Tip</p>
                <p className="text-sm text-sky-700">{level.hint}</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-left text-sm text-amber-800">
                <div className="font-semibold mb-1">Star Goal</div>
                <div>3 stars: {level.starThresholds.three} move{level.starThresholds.three !== 1 ? 's' : ''}</div>
                <div>2 stars: {level.starThresholds.two} move{level.starThresholds.two !== 1 ? 's' : ''} or greater</div>
                {record && (
                  <div className="mt-2 text-green-700 font-medium">
                    Best run: {record.bestMoves} move{record.bestMoves !== 1 ? 's' : ''} · {record.bestStars} star{record.bestStars !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <motion.button
                  onClick={handleStart}
                  className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl py-4 px-8 rounded-2xl shadow-lg cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Let&apos;s Go! <ChevronRight className="inline w-6 h-6 ml-1" />
                </motion.button>

                {levelIndex > 0 && (
                  <motion.button
                    onClick={() => openLevel(levelIndex - 1, 'intro')}
                    className="bg-white hover:bg-gray-50 text-gray-700 font-bold text-lg py-4 px-6 rounded-2xl shadow-md border border-gray-200 cursor-pointer"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <ChevronLeft className="inline w-5 h-5 mr-1" /> Prev
                  </motion.button>
                )}
              </div>
            </div>

            <div className="lg:w-80">
              <LevelPicker compact />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'celebration') {
    const isLastLevel = levelIndex + 1 >= levels.length;
    const nextPieceType = !isLastLevel ? levels[levelIndex + 1].pieceType : null;
    const isNewPieceNext = nextPieceType && nextPieceType !== level.pieceType;
    const showRetry = lastRunStars < 3;

    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 via-amber-100 to-orange-200 flex items-center justify-center p-4 overflow-hidden">
        {[...Array(16)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            initial={{ x: `${(i * 6.25) % 100}vw`, y: -60, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 1.5, repeat: Infinity, ease: 'linear' }}
          >
            {['⭐', '🎉', '🌟', '✨', '🎊', '💛'][i % 6]}
          </motion.div>
        ))}

        <motion.div
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-xl w-full text-center relative z-10"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <div className="flex justify-center mb-5">
            <ProgressBar />
          </div>

          <motion.div
            className="text-7xl mb-3"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.8 }}
          >
            🎉
          </motion.div>

          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Amazing!</h1>
          <p className="text-lg text-gray-600 mb-4">
            The {pieceName(level.pieceType)} reached the flag in <span className="font-bold text-amber-600">{moveCount}</span>{' '}
            move{moveCount !== 1 ? 's' : ''}.
          </p>

          <div className="flex justify-center gap-3 mb-3">
            {[1, 2, 3].map(s => (
              <motion.div
                key={s}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: s <= lastRunStars ? 1 : 0.5, rotate: 0, opacity: s <= lastRunStars ? 1 : 0.25 }}
                transition={{ delay: 0.4 + s * 0.2, type: 'spring', stiffness: 300 }}
              >
                <Star className={`w-12 h-12 ${s <= lastRunStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
              </motion.div>
            ))}
          </div>

          {showRetry && (
            <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-4 mb-5 text-sky-800 text-sm">
              Nice job! Want all <strong>3 stars</strong>? You can retry this level for a better route.
            </div>
          )}

          {isNewPieceNext && nextPieceType && (
            <motion.div
              className="bg-purple-50 border-2 border-purple-200 rounded-xl p-3 mb-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-sm text-purple-700">
                Next up: the <strong>{pieceName(nextPieceType)}</strong> {pieceEmoji(nextPieceType)}
              </p>
            </motion.div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {showRetry && (
              <motion.button
                onClick={handleRetryLevel}
                className="bg-white hover:bg-sky-50 text-sky-700 font-bold text-lg py-3 px-6 rounded-2xl shadow-md border border-sky-200 cursor-pointer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <RotateCcw className="inline w-5 h-5 mr-2" /> Retry Level
              </motion.button>
            )}

            <motion.button
              onClick={handleNext}
              className="bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 text-white font-bold text-xl py-3.5 px-8 rounded-2xl shadow-lg cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {isLastLevel ? (
                <>See Results! <Trophy className="inline w-6 h-6 ml-1" /></>
              ) : (
                <>Next Adventure! <ChevronRight className="inline w-6 h-6 ml-1" /></>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === 'allDone') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-300 via-pink-200 to-yellow-200 flex items-center justify-center p-4">
        <motion.div
          className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-4xl w-full text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <motion.div
            className="text-7xl mb-4"
            animate={{ rotate: [0, 10, -10, 10, 0], y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🏆
          </motion.div>

          <h1 className="text-4xl font-extrabold text-gray-800 mb-3">You&apos;re a Chess Star!</h1>
          <p className="text-lg text-gray-600 mb-2">You explored every piece path and puzzle.</p>
          <p className="text-sm text-gray-500 mb-6">
            Completed {completedCount} / {levels.length} levels · Collected {totalStars} / {levels.length * 3} stars
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="grid grid-cols-3 gap-4">
              {[
                { type: 'rook' as PieceType, label: 'Rook', desc: 'Straight lines' },
                { type: 'bishop' as PieceType, label: 'Bishop', desc: 'Diagonals' },
                { type: 'knight' as PieceType, label: 'Knight', desc: 'L-shaped jumps' },
              ].map((p, i) => (
                <motion.div
                  key={p.type}
                  className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-xl p-4 border-2 border-amber-200"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.2 }}
                >
                  <div className="mb-2 flex justify-center">
                    <ChessPieceIcon type={p.type} size={40} />
                  </div>
                  <div className="text-sm font-bold text-amber-800">{p.label}</div>
                  <div className="text-xs text-amber-600">{p.desc}</div>
                  <div className="text-green-500 text-xs mt-1 font-semibold">✓ Mastered</div>
                </motion.div>
              ))}
            </div>

            <LevelPicker />
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <motion.button
              onClick={() => openLevel(0, 'intro')}
              className="bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white font-bold text-xl py-4 px-8 rounded-2xl shadow-lg cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw className="inline w-5 h-5 mr-2" /> Play Again
            </motion.button>
            <motion.button
              onClick={() => openLevel(Math.min(unlockedLevel, levels.length - 1), 'intro')}
              className="bg-white hover:bg-gray-50 text-gray-700 font-bold text-xl py-4 px-8 rounded-2xl shadow-md border border-gray-200 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <SkipBack className="inline w-5 h-5 mr-2" /> Revisit Levels
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-emerald-100 flex flex-col items-center justify-center p-4 select-none">
      <motion.div className="w-full max-w-xl mb-4" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="flex justify-center mb-3">
          <ProgressBar />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/80 rounded-xl p-1.5 shadow-sm shrink-0">
              <ChessPieceIcon type={level.pieceType} size={36} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-800 leading-tight truncate">{level.name}</h2>
              <p className="text-xs text-gray-500">
                {pieceName(level.pieceType)} · Level {level.id} · 3★ in {level.starThresholds.three}
              </p>
            </div>
          </div>
          <motion.div
            className="bg-white/80 rounded-full px-4 py-1.5 shadow-sm text-sm font-bold text-gray-700 shrink-0"
            key={moveCount}
            animate={{ scale: [1.15, 1] }}
            transition={{ duration: 0.2 }}
          >
            {moveCount} move{moveCount !== 1 ? 's' : ''}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="relative rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{ width: `${BOARD_SIZE * SQUARE_SIZE}px`, height: `${BOARD_SIZE * SQUARE_SIZE}px` }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        key={`board-${levelIndex}`}
      >
        <div className="grid grid-cols-5 absolute inset-0">
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => {
            const r = Math.floor(i / BOARD_SIZE);
            const c = i % BOARD_SIZE;
            const river = isRiver(r, c);
            const bridge = isBridge(r, c);
            const goal = isGoal(r, c);
            const valid = isValid(r, c);
            const piece = isPiece(r, c);
            const inTrail = isTrail(r, c) && !piece;
            const decoration = !river && !bridge && !goal && !piece ? getDecoration(r, c) : null;

            return (
              <motion.div
                key={`${r}-${c}`}
                className={`relative ${getSquareClasses(r, c)} ${valid ? 'cursor-pointer' : ''}`}
                style={{ width: `${SQUARE_SIZE}px`, height: `${SQUARE_SIZE}px` }}
                onClick={() => handleSquareClick(r, c)}
                whileHover={valid ? { scale: 1.03 } : {}}
              >
                {!river && !bridge && (
                  <div className={`absolute inset-0 ${(r + c) % 2 === 0 ? 'grass-light' : 'grass-dark'}`} />
                )}

                {river && !bridge && (
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.25) 14px, rgba(255,255,255,0.25) 18px)',
                      }}
                      animate={{ x: [0, 18] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center text-xl opacity-30 pointer-events-none"
                      animate={{ x: [-5, 5, -5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      {(r + c) % 3 === 0 ? '🐟' : '〰️'}
                    </motion.div>
                  </div>
                )}

                {bridge && (
                  <div className="absolute inset-0">
                    <div className="absolute inset-2 rounded-md border-2 border-amber-900/30 bg-amber-600/20" />
                    {[0, 1, 2, 3].map(j => (
                      <div
                        key={j}
                        className="absolute bg-amber-900/20 rounded-sm"
                        style={{ width: '76%', height: '3px', top: `${20 + j * 20}%`, left: '12%' }}
                      />
                    ))}
                    <div className="absolute top-2 bottom-2 left-2 w-1 bg-amber-800/40 rounded-full" />
                    <div className="absolute top-2 bottom-2 right-2 w-1 bg-amber-800/40 rounded-full" />
                  </div>
                )}

                {decoration && !inTrail && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm opacity-30 pointer-events-none">{decoration}</div>
                )}

                {inTrail && !goal && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.3 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div className="w-4 h-4 rounded-full bg-amber-600/40" />
                  </motion.div>
                )}

                {goal && !piece && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="absolute inset-1.5 rounded-xl bg-yellow-300/40 border-2 border-yellow-400/60" />
                    <Flag className="w-9 h-9 text-red-500 drop-shadow-lg relative z-[1]" />
                  </motion.div>
                )}

                {valid && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <motion.div
                      className={`rounded-full border-2 ${
                        goal ? 'w-10 h-10 bg-green-300/50 border-green-400' : 'w-5 h-5 bg-yellow-300/60 border-yellow-400/80'
                      }`}
                      animate={{
                        boxShadow: goal
                          ? [
                              '0 0 10px rgba(74,222,128,0.4)',
                              '0 0 20px rgba(74,222,128,0.7)',
                              '0 0 10px rgba(74,222,128,0.4)',
                            ]
                          : [
                              '0 0 6px rgba(250,204,21,0.3)',
                              '0 0 14px rgba(250,204,21,0.6)',
                              '0 0 6px rgba(250,204,21,0.3)',
                            ],
                        scale: [1, 1.12, 1],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  </motion.div>
                )}

                {hasFence(r, c, 'top') && (
                  <div className="absolute top-0 left-0 right-0 z-[5] flex items-center" style={{ height: '6px' }}>
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                )}
                {hasFence(r, c, 'bottom') && (
                  <div className="absolute bottom-0 left-0 right-0 z-[5] flex items-center" style={{ height: '6px' }}>
                    <div
                      className="w-full h-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                )}
                {hasFence(r, c, 'left') && (
                  <div className="absolute top-0 left-0 bottom-0 z-[5] flex items-center" style={{ width: '6px' }}>
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)',
                        boxShadow: '2px 0 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                )}
                {hasFence(r, c, 'right') && (
                  <div className="absolute top-0 right-0 bottom-0 z-[5] flex items-center" style={{ width: '6px' }}>
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)',
                        boxShadow: '-2px 0 4px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="absolute z-10 pointer-events-none"
          style={{ width: `${SQUARE_SIZE}px`, height: `${SQUARE_SIZE}px` }}
          animate={{ left: piecePos.col * SQUARE_SIZE, top: piecePos.row * SQUARE_SIZE }}
          transition={
            level.pieceType === 'knight'
              ? { type: 'spring', stiffness: 160, damping: 16 }
              : { type: 'spring', stiffness: 280, damping: 26 }
          }
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            key={animKey}
            animate={level.pieceType === 'knight' ? { y: [0, -22, 0], rotate: [0, -5, 5, 0] } : { y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <motion.div
              animate={{
                filter: [
                  'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
                  'drop-shadow(0 6px 10px rgba(0,0,0,0.35))',
                  'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ChessPieceIcon type={level.pieceType} size={SQUARE_SIZE * 0.7} />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex flex-wrap items-center justify-center gap-3 mt-5"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          onClick={() => openLevel(levelIndex, 'intro')}
          className="bg-white/80 hover:bg-white text-gray-700 font-semibold py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2 text-sm border border-gray-200 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SkipBack className="w-4 h-4" /> Level Menu
        </motion.button>

        {levelIndex > 0 && (
          <motion.button
            onClick={() => openLevel(levelIndex - 1, 'intro')}
            className="bg-white/80 hover:bg-white text-gray-700 font-semibold py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2 text-sm border border-gray-200 cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </motion.button>
        )}

        <motion.button
          onClick={handleReset}
          className="bg-white/80 hover:bg-white text-gray-700 font-semibold py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2 text-sm border border-gray-200 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RotateCcw className="w-4 h-4" /> Restart
        </motion.button>

        <motion.button
          onClick={() => setShowHint(!showHint)}
          className={`font-semibold py-2.5 px-5 rounded-xl shadow-md flex items-center gap-2 text-sm border cursor-pointer ${
            showHint
              ? 'bg-yellow-200 text-yellow-900 border-yellow-300'
              : 'bg-yellow-50/80 hover:bg-yellow-100 text-yellow-800 border-yellow-200'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <HelpCircle className="w-4 h-4" /> Hint
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showHint && level.hint && (
          <motion.div
            className="mt-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl py-3 px-5 max-w-md text-sm text-yellow-800 shadow-lg"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
          >
            💡 {level.hint}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-emerald-300 border border-emerald-500 inline-block" /> Grass
        </span>
        {level.obstacles.rivers.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-blue-400 border border-blue-500 inline-block" /> River
          </span>
        )}
        {level.obstacles.bridges.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded bg-amber-500 border border-amber-600 inline-block" /> Bridge
          </span>
        )}
        {level.obstacles.fences.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-1.5 rounded bg-amber-800 inline-block" /> Fence
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-red-500" /> Goal
        </span>
      </motion.div>
    </div>
  );
}

export default App;

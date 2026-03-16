import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { BoardShell } from './components/BoardShell';
import { StarfieldCanvas } from './components/StarfieldCanvas';
import { ScrollBoard } from './components/ScrollBoard';
import { WorldMap } from './WorldMap';
import { Roster } from './Roster';
import { TrialMode } from './TrialMode';
import { Enemy, Food, Level, PieceType, Position } from './types';
import {
  WORLDS,
  WORLD_LEVELS,
  DUO_WORLD_LEVELS,
  loadProgress,
  markWorldComplete,
  getUnlockedWorlds,
  AdventureProgress,
} from './adventure/worlds';
import { DuoLevel } from './adventure/duoLevelDef';
import { DuoBoard } from './components/DuoBoard';

// Register all world levels and pull the queen finale array
import { queenFinale } from './adventure/levels/index';
import { CHALLENGE_LEVELS } from './adventure/levels/shifting';
import {
  encodeBuiltinChallenge,
  decodeChallenge,
  loadGhost,
  saveGhostIfBest,
  getAttempts,
  incrementAttempts,
} from './adventure/sharing';
import { playCelebrationSound } from './utils/sounds';
import { GalleryBoard } from './components/GalleryBoard';
import { OracleMode } from './adventure/OracleMode';

// ─── Dad Cheat — URL param helpers ───────────────────────────────────────────
// ?adventure&dadcheat               — all worlds unlocked, trials skipped
// ?adventure&dadcheat&world=2       — jump straight into world 2
// ?adventure&dadcheat&world=2&level=5 — jump to world 2, level 5 (1-indexed)

const _params = new URLSearchParams(window.location.search);
const IS_DAD_CHEAT    = _params.has('dadcheat');
const DAD_CHEAT_WORLD = _params.has('world')  ? Math.max(0, parseInt(_params.get('world')!,  10)) : null;
const DAD_CHEAT_LEVEL = _params.has('level')  ? Math.max(1, parseInt(_params.get('level')!,  10)) - 1 : 0;
const CHALLENGE       = decodeChallenge(_params);

// ─── Remix Mode — per-world config ───────────────────────────────────────────
// After the story beat, a remix card offers the player the same board from a
// specific level re-played as a different piece. No new level design needed.
// The contrast between the two piece performances is the entire teaching moment.

type RemixConfig = {
  /** 0-indexed level within this world to use as the remix board. */
  levelIndex: number;
  /** The piece the player swaps to. */
  remixPiece: PieceType;
  /** Short invitation shown on the offer card. */
  offer: string;
  /** One sentence describing what the original piece did. */
  contrast: string;
  /** One sentence takeaway shown on the result card. */
  insight: string;
};

const REMIX_CONFIGS: Partial<Record<number, RemixConfig>> = {
  0: {
    levelIndex: 3,       // A4 — The Meadow Path (king, 4 moves)
    remixPiece: 'rook',
    offer: 'Now try The Meadow Path as a Rook!',
    contrast: 'The king crossed in 4 careful steps.',
    insight: 'The rook slides all the way in one move. Same meadow — no footsteps needed.',
  },
  1: {
    levelIndex: 7,       // F8 — The Long Field (pawn, 7 moves)
    remixPiece: 'rook',
    offer: 'Now run The Long Field as a Rook!',
    contrast: 'The pawn marched the whole field — 7 careful steps.',
    insight: 'The rook just went. No stops, no turns. One slide from end to end.',
  },
  2: {
    levelIndex: 1,       // R2 — The Corridor (rook, 1 move)
    remixPiece: 'bishop',
    offer: 'Now try The Corridor as a Bishop!',
    contrast: 'The rook crossed the whole corridor in one move.',
    insight: "The bishop can't go straight — every square is a diagonal away.",
  },
  3: {
    levelIndex: 5,       // B6 — Mossy Trail (bishop, 4 moves)
    remixPiece: 'rook',
    offer: 'Now try the Mossy Trail as a Rook!',
    contrast: 'The bishop wound through 4 careful bends to get there.',
    insight: "The rook doesn't bend. It just goes straight up.",
  },
  4: {
    levelIndex: 5,       // K6 — The Ambush (knight; defined in Milestone 12)
    remixPiece: 'rook',
    offer: 'Now try The Ambush as a Rook!',
    contrast: 'The knight jumped clean over every obstacle.',
    insight: "The rook can't jump. Every obstacle is a wall.",
  },
  6: {
    levelIndex: 2,       // Q3 — Straight Power (queen; defined in Milestone 14)
    remixPiece: 'bishop',
    offer: 'Now try Straight Power as a Bishop!',
    contrast: 'The queen fired straight down the line.',
    insight: 'The bishop only moves diagonally — same board, completely different route.',
  },
  7: {
    levelIndex: 3,       // S4 — Long Vacuum (rook, 1 move across 11 columns)
    remixPiece: 'bishop',
    offer: 'Now cross the Long Vacuum as a Bishop!',
    contrast: 'The rook crossed 11 columns in a single move.',
    insight: "The bishop zigzags — 6 moves where the rook needed 1. Distance is a rook's friend.",
  },
};

// ─── Top-level phase ──────────────────────────────────────────────────────────

type AppPhase = 'title' | 'worldMap' | 'playWorld' | 'challenge' | 'oracle';

export default function AdventureApp() {
  const [phase, setPhase] = useState<AppPhase>(() => {
    if (IS_DAD_CHEAT && DAD_CHEAT_WORLD !== null) return 'playWorld';
    if (IS_DAD_CHEAT) return 'worldMap'; // skip title, land on unlocked map
    if (CHALLENGE) return 'playWorld';   // challenge URL → jump straight in
    return 'title';
  });

  const [selectedWorld, setSelectedWorld] = useState(() => {
    if (IS_DAD_CHEAT && DAD_CHEAT_WORLD !== null) return DAD_CHEAT_WORLD;
    if (CHALLENGE) return CHALLENGE.worldId;
    return 0;
  });

  const [progress, setProgress]             = useState<AdventureProgress>(loadProgress);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [challengeWorldId, setChallengeWorldId]   = useState<number | null>(null);
  // World 9 shows a gallery interstitial before the regular level sequence
  const [firstBoardGalleryDone, setFirstBoardGalleryDone] = useState(false);

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
    // After completing Act 1, offer "Add to home screen" if PWA prompt is available
    if (worldId === 0) {
      const a2hs = (window as unknown as Record<string, unknown>).__tbkA2HS;
      if (a2hs) setShowInstallBanner(true);
    }
  };

  const handleInstallClick = () => {
    const a2hs = (window as unknown as Record<string, unknown>).__tbkA2HS as { prompt: () => void } | undefined;
    if (a2hs) { a2hs.prompt(); }
    setShowInstallBanner(false);
  };

  if (phase === 'title') {
    return <TitleScreen onBegin={() => setPhase('worldMap')} />;
  }

  if (phase === 'challenge' && challengeWorldId !== null) {
    return (
      <ChallengePlay
        worldId={challengeWorldId}
        onComplete={() => setPhase('worldMap')}
        onBack={() => setPhase('worldMap')}
      />
    );
  }

  if (phase === 'oracle') {
    return <OracleMode onBack={() => setPhase('worldMap')} />;
  }

  if (phase === 'worldMap') {
    return (
      <div style={{ position: 'relative' }}>
        <WorldMap
          completedWorlds={progress.completedWorlds}
          unlockedWorlds={unlockedWorlds}
          onSelectWorld={handleSelectWorld}
          onBack={() => setPhase('title')}
          onSelectChallenge={(worldId) => {
            setChallengeWorldId(worldId);
            setPhase('challenge');
          }}
          onSelectOracle={() => setPhase('oracle')}
        />
        <AnimatePresence>
          {showInstallBanner && (
            <motion.div
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl px-5 py-3 shadow-2xl text-sm font-semibold text-gray-800 whitespace-nowrap"
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            >
              <span>📱 Play offline — add to home screen!</span>
              <button
                onClick={handleInstallClick}
                className="bg-amber-400 hover:bg-amber-500 text-white font-bold px-3 py-1 rounded-xl cursor-pointer text-xs"
              >
                Add
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none text-base leading-none"
                aria-label="Dismiss install prompt"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Queen's Realm (world 6) is a mixed world: solo queen levels Q1-Q7, then
  // a duo knight+king finale (Q8-Q9). QueenWorldPlay handles both phases.
  if (selectedWorld === 6) {
    return (
      <QueenWorldPlay
        worldId={selectedWorld}
        completedWorlds={progress.completedWorlds}
        initialLevelIndex={
          IS_DAD_CHEAT ? DAD_CHEAT_LEVEL
          : CHALLENGE?.worldId === selectedWorld ? CHALLENGE.levelIndex
          : 0
        }
        skipTrial={IS_DAD_CHEAT}
        onComplete={() => handleWorldComplete(selectedWorld)}
        onBack={() => setPhase('worldMap')}
      />
    );
  }

  // World 9 "The First Board" — gallery interstitial before regular levels
  if (selectedWorld === 9 && !firstBoardGalleryDone && !IS_DAD_CHEAT) {
    return (
      <FirstBoardGallery
        onDone={() => setFirstBoardGalleryDone(true)}
        onBack={() => setPhase('worldMap')}
      />
    );
  }

  // Duo worlds have two-piece levels — use the dedicated DuoWorldPlay component
  if (DUO_WORLD_LEVELS[selectedWorld]) {
    return (
      <DuoWorldPlay
        worldId={selectedWorld}
        completedWorlds={progress.completedWorlds}
        initialLevelIndex={
          IS_DAD_CHEAT ? DAD_CHEAT_LEVEL
          : CHALLENGE?.worldId === selectedWorld ? CHALLENGE.levelIndex
          : 0
        }
        onComplete={() => handleWorldComplete(selectedWorld)}
        onBack={() => setPhase('worldMap')}
      />
    );
  }

  return (
    <WorldPlay
      worldId={selectedWorld}
      completedWorlds={progress.completedWorlds}
      initialLevelIndex={
        IS_DAD_CHEAT ? DAD_CHEAT_LEVEL
        : CHALLENGE?.worldId === selectedWorld ? CHALLENGE.levelIndex
        : 0
      }
      skipTrial={IS_DAD_CHEAT}
      onComplete={() => handleWorldComplete(selectedWorld)}
      onBack={() => setPhase('worldMap')}
    />
  );
}

// ─── WorldPlay ────────────────────────────────────────────────────────────────

type PlayPhase = 'intro' | 'playing' | 'promotion' | 'celebration' | 'trial' | 'story' | 'remix-offer' | 'remix-playing' | 'remix-result' | 'done';

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
  // 3-beat staged intro: 0=meet piece, 1=lesson, 2=ready to play
  const [introStep, setIntroStep] = useState<0 | 1 | 2>(0);
  const [introBtnVisible, setIntroBtnVisible] = useState(skipTrial); // dad cheat: always visible
  const [consumedFood,    setConsumedFood]    = useState<Food[]>([]);
  const [capturedEnemies, setCapturedEnemies] = useState<Enemy[]>([]);
  const [trail,           setTrail]           = useState<Position[]>([levels[levelIndex]?.start ?? { row: 0, col: 0 }]);
  const [moveCount,       setMoveCount]       = useState(0);
  const [resetCount,      setResetCount]      = useState(0);
  const [lastStars,       setLastStars]       = useState(0);
  const [promotedPiece,   setPromotedPiece]   = useState<PieceType | null>(null);

  // ── Remix state ──────────────────────────────────────────────────────────
  const [isStuck,           setIsStuck]           = useState(false);
  const [isRemixStuck,      setIsRemixStuck]      = useState(false);

  const [remixMoveCount,    setRemixMoveCount]    = useState(0);
  const [remixLastStars,    setRemixLastStars]    = useState(0);
  const [remixResetCount,   setRemixResetCount]   = useState(0);
  const [remixConsumedFood, setRemixConsumedFood] = useState<Food[]>([]);
  const [remixTrail,        setRemixTrail]        = useState<Position[]>([]);

  const level: Level = levels[levelIndex];
  const isLastLevel  = levelIndex === levels.length - 1;

  // ── Piece Selector (space world) ─────────────────────────────────────────
  // Lets the player choose which piece to play before each level starts.
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const effectiveLevel: Level = selectedPieceType
    ? { ...level, pieceType: selectedPieceType }
    : level;

  // Dynamic squareSize: shrink for boards wider than 5 columns
  const _boardCols = effectiveLevel?.boardWidth ?? 5;
  const squareSize = _boardCols > 5
    ? Math.min(56, Math.floor((Math.min(window.innerWidth, 600) - 48) / _boardCols))
    : 72;

  // ── Ghost replay state ────────────────────────────────────────────────────
  const [ghostRoute, setGhostRoute] = useState<Position[] | null>(null);
  const [ghostStep,  setGhostStep]  = useState(0);
  const ghostPos = ghostRoute ? (ghostRoute[ghostStep] ?? null) : null;

  // Advance ghost one step at a time while playing
  useEffect(() => {
    if (!ghostRoute || playPhase !== 'playing' || ghostStep >= ghostRoute.length - 1) return;
    const t = setTimeout(() => setGhostStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [ghostRoute, ghostStep, playPhase]);

  // Fade-in timer for intro beat buttons. Dad cheat skips all delays.
  const INTRO_DELAYS: [number, number, number] = skipTrial ? [0, 0, 0] : [1200, 1500, 1000];
  useEffect(() => {
    if (playPhase !== 'intro') return;
    if (skipTrial) { setIntroBtnVisible(true); return; }
    setIntroBtnVisible(false);
    const t = setTimeout(() => setIntroBtnVisible(true), INTRO_DELAYS[introStep]);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introStep, playPhase]);

  // Remix config and derived level (null if this world has no remix or the level doesn't exist yet)
  const remixConfig = REMIX_CONFIGS[worldId] ?? null;
  const remixSourceLevel = remixConfig ? (levels[remixConfig.levelIndex] ?? null) : null;
  const remixLevel: Level | null = remixSourceLevel
    ? { ...remixSourceLevel, pieceType: remixConfig!.remixPiece }
    : null;

  const startLevel = () => {
    setConsumedFood([]);
    setCapturedEnemies([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
    setPromotedPiece(null);
    // Ghost: show from attempt 3+ onward
    incrementAttempts(worldId, levelIndex);
    if (getAttempts(worldId, levelIndex) >= 3) {
      setGhostRoute(loadGhost(worldId, levelIndex));
    } else {
      setGhostRoute(null);
    }
    setGhostStep(0);
    setPlayPhase('playing');
  };

  const resetBoard = () => {
    setConsumedFood([]);
    setCapturedEnemies([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
    setGhostStep(0);
  };

  const startRemix = () => {
    if (!remixLevel) return;
    setRemixConsumedFood([]);
    setRemixTrail([remixLevel.start]);
    setRemixMoveCount(0);
    setRemixResetCount(c => c + 1);
    setIsRemixStuck(false);
    setPlayPhase('remix-playing');
  };

  const resetRemix = () => {
    if (!remixLevel) return;
    setRemixConsumedFood([]);
    setRemixTrail([remixLevel.start]);
    setRemixMoveCount(0);
    setRemixResetCount(c => c + 1);
    setIsRemixStuck(false);
  };

  const handleMove = (newPos: Position, capturedEnemy?: Enemy) => {
    const newTrail = [...trail, newPos];
    setTrail(newTrail);
    const next = moveCount + 1;
    setMoveCount(next);
    const pieceType = effectiveLevel.pieceType;

    if (capturedEnemy) {
      const newCaptured = [...capturedEnemies, capturedEnemy];
      setCapturedEnemies(newCaptured);
      // captureAll win: all enemies cleared
      if (level.captureAll && newCaptured.length >= (level.enemies?.length ?? 0)) {
        setLastStars(getStars(level.starThresholds, next));
        setTimeout(() => {
          playCelebrationSound(pieceType);
          setPlayPhase('celebration');
        }, 600);
      }
      return; // capture move done — skip goal check
    }

    if (!level.captureAll && newPos.row === level.goal.row && newPos.col === level.goal.col) {
      saveGhostIfBest(worldId, levelIndex, newTrail);
      setLastStars(getStars(level.starThresholds, next));
      if (level.allowPromotion) {
        // Show promotion picker instead of immediate celebration
        setTimeout(() => setPlayPhase('promotion'), 600);
      } else {
        setTimeout(() => {
          playCelebrationSound(pieceType);
          setPlayPhase('celebration');
        }, 600);
      }
    }
  };

  const handleNext = () => {
    setSelectedPieceType(null);
    setPromotedPiece(null);
    if (isLastLevel) {
      // Last level done: skip trial for dad cheat, otherwise run it
      setPlayPhase(skipTrial ? 'story' : 'trial');
    } else {
      const next = levelIndex + 1;
      setLevelIndex(next);
      setConsumedFood([]);
      setCapturedEnemies([]);
      setTrail([levels[next].start]);
      setMoveCount(0);
      setResetCount(c => c + 1);
      setGhostRoute(null);
      setGhostStep(0);
      setIntroStep(0);
      setPlayPhase('intro');
    }
  };

  const handleRemixMove = (newPos: Position) => {
    if (!remixLevel) return;
    setRemixTrail(prev => [...prev, newPos]);
    const next = remixMoveCount + 1;
    setRemixMoveCount(next);
    if (newPos.row === remixLevel.goal.row && newPos.col === remixLevel.goal.col) {
      setRemixLastStars(getStars(remixLevel.starThresholds, next));
      setTimeout(() => setPlayPhase('remix-result'), 600);
    }
  };

  // ── Intro card (3-beat staged read) ──
  if (playPhase === 'intro') {
    const ALL_PIECES: PieceType[] = ['king', 'pawn', 'rook', 'bishop', 'knight', 'queen'];
    const activePiece = selectedPieceType ?? level.pieceType;

    const advanceIntro = () => {
      if (introStep < 2) {
        setIntroStep((introStep + 1) as 0 | 1 | 2);
      }
    };

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.spaceTheme ? undefined : world.palette.bg, position: 'relative' }}
      >
        {world.spaceTheme && <StarfieldCanvas />}

        <AnimatePresence mode="wait">
          {/* ── Beat 0: Meet the piece ── */}
          {introStep === 0 && (
            <motion.div
              key={`intro-${levelIndex}-0`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-w-sm w-full flex flex-col items-center"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-6 opacity-60" style={{ color: world.palette.accent }}>
                {world.name} · Level {levelIndex + 1} of {levels.length}
              </div>

              <motion.div
                className="mb-6"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChessPieceIcon type={activePiece} size={100} />
              </motion.div>

              <motion.h2
                className="text-4xl font-extrabold mb-2 capitalize"
                style={{ color: world.palette.accent }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                {activePiece === level.pieceType ? `The ${activePiece.charAt(0).toUpperCase() + activePiece.slice(1)}` : level.name}
              </motion.h2>

              <motion.p
                className="text-lg font-semibold text-gray-500 mb-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {world.tagline}
              </motion.p>

              <AnimatePresence>
                {introBtnVisible && (
                  <motion.button
                    onClick={advanceIntro}
                    className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Let's see the level →
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                onClick={onBack}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                ← World Map
              </button>
            </motion.div>
          )}

          {/* ── Beat 1: Here's the lesson ── */}
          {introStep === 1 && (
            <motion.div
              key={`intro-${levelIndex}-1`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-w-sm w-full flex flex-col items-center"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {/* World emoji drifts in decoratively */}
              <motion.div
                className="text-5xl mb-4 select-none pointer-events-none"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 18 }}
              >
                {world.emoji}
              </motion.div>

              <motion.h2
                className="text-3xl font-extrabold text-gray-800 mb-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {level.name}
              </motion.h2>

              <motion.p
                className="text-lg text-gray-600 leading-relaxed mb-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                {level.description}
              </motion.p>

              {level.hint && (
                <motion.div
                  className="bg-white/70 border-2 border-sky-200 rounded-2xl p-4 mb-5 text-base text-sky-800 w-full"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  💡 {level.hint}
                </motion.div>
              )}

              <AnimatePresence>
                {introBtnVisible && (
                  <motion.button
                    onClick={advanceIntro}
                    className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    I'm ready →
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                onClick={() => setIntroStep(0)}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ── Beat 2: Ready to play ── */}
          {introStep === 2 && (
            <motion.div
              key={`intro-${levelIndex}-2`}
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="max-w-sm w-full flex flex-col items-center"
              style={{ position: 'relative', zIndex: 1 }}
            >
              <motion.div
                className="mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChessPieceIcon type={activePiece} size={70} />
              </motion.div>

              {/* Piece Selector — space worlds */}
              {world.spaceTheme && (
                <motion.div
                  className="mb-5 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#818cf8' }}>
                    Choose Your Piece
                  </div>
                  <div className="flex justify-center gap-2">
                    {ALL_PIECES.map(p => (
                      <button
                        key={p}
                        onClick={() => setSelectedPieceType(p)}
                        aria-label={`Play as ${p}`}
                        className="rounded-xl border-2 p-1.5 cursor-pointer transition-all"
                        style={{
                          borderColor: activePiece === p ? '#818cf8' : 'transparent',
                          background:  activePiece === p ? 'rgba(129,140,248,0.18)' : 'rgba(255,255,255,0.08)',
                          transform:   activePiece === p ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        <ChessPieceIcon type={p} size={34} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                className="bg-white/50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800 w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="font-semibold">3 ★</span> in {level.starThresholds.three} move{level.starThresholds.three !== 1 ? 's' : ''}
                {' · '}
                <span className="font-semibold">2 ★</span> in {level.starThresholds.two}
              </motion.div>

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
                      setIntroStep(0);
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
                      setIntroStep(0);
                    }}
                    disabled={levelIndex === levels.length - 1}
                    className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 hover:bg-white cursor-pointer bg-white/40 disabled:opacity-30"
                  >
                    Next level ▶
                  </button>
                </div>
              )}

              <AnimatePresence>
                {introBtnVisible && (
                  <motion.button
                    onClick={startLevel}
                    className="w-full text-white font-bold text-2xl py-5 rounded-2xl shadow-xl cursor-pointer"
                    style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {levelIndex === 0 ? "Let's Go! 🌟" : 'Play! 🌟'}
                  </motion.button>
                )}
              </AnimatePresence>

              <button
                onClick={() => setIntroStep(1)}
                className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Playing ──
  if (playPhase === 'playing') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 select-none"
        style={{ background: world.spaceTheme ? undefined : world.palette.bg, position: 'relative', zIndex: 1 }}
      >
        {world.spaceTheme && <StarfieldCanvas />}
        <motion.div
          className="text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: world.palette.accent }}>
            {effectiveLevel.name}
          </div>
          <motion.span
            className="text-sm font-bold"
            style={{ color: world.spaceTheme ? '#c7d2fe' : '#374151' }}
            key={moveCount}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {moveCount} move{moveCount !== 1 ? 's' : ''}
            {level.captureAll && level.enemies && (
              <span className="ml-2 opacity-70">
                · {capturedEnemies.length}/{level.enemies.length} captured
              </span>
            )}
          </motion.span>
        </motion.div>

        {effectiveLevel.scrollAxis ? (
          <ScrollBoard
            key={`world${worldId}-${levelIndex}-${resetCount}`}
            level={effectiveLevel}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={squareSize}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={setIsStuck}
            showCheckerboard={worldId === 3}
            ghostPos={ghostPos}
            spaceTheme={world.spaceTheme}
          />
        ) : (
          <BoardShell
            key={`world${worldId}-${levelIndex}-${resetCount}`}
            level={effectiveLevel}
            consumedFood={consumedFood}
            trail={trail}
            squareSize={squareSize}
            isMobile={false}
            onMove={handleMove}
            onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
            onStuck={setIsStuck}
            showCheckerboard={worldId === 3}
            ghostPos={ghostPos}
            spaceTheme={world.spaceTheme}
            enemies={level.enemies}
            capturedEnemies={capturedEnemies}
          />
        )}

        {isStuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            No moves left! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetBoard}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${
              isStuck
                ? 'text-red-600 border-red-300 bg-red-50 font-semibold hover:bg-red-100'
                : 'text-gray-500 border-gray-300 hover:bg-white bg-white/60'
            }`}
          >
            ↺ Restart
          </button>
          <button
            onClick={() => { setIntroStep(0); setPlayPhase('intro'); }}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Level Info
          </button>
        </div>
      </div>
    );
  }

  // ── Promotion Picker ──
  if (playPhase === 'promotion') {
    const PROMO_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center"
        style={{ background: 'linear-gradient(to bottom, #fef3c7, #fde68a, #d1fae5)' }}
      >
        {/* Crown descends */}
        <motion.div
          className="text-6xl select-none"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
        >
          👑
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className="text-2xl font-extrabold text-amber-900 mb-1">
            Your pawn reached the end!
          </h2>
          <p className="text-amber-700 text-base">Choose its new form.</p>
        </motion.div>

        {/* Piece choice grid */}
        <motion.div
          className="grid grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {PROMO_PIECES.map((piece, i) => (
            <motion.button
              key={piece}
              onClick={() => {
                setPromotedPiece(piece);
                playCelebrationSound(piece);
                setPlayPhase('celebration');
              }}
              className="flex flex-col items-center gap-2 bg-white/80 rounded-2xl p-3 shadow-md cursor-pointer border-2 border-white hover:border-amber-400"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.65 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
            >
              <ChessPieceIcon type={piece} size={56} />
              <span className="capitalize text-sm font-bold text-gray-700">{piece}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>
    );
  }

  // ── Celebration ──
  if (playPhase === 'celebration') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-200 via-amber-100 to-orange-100 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden">
        {/* Falling emoji stream */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            style={{ left: `${(i * 8.5) % 100}vw` }}
            initial={{ y: -120, opacity: 1 }}
            animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 1.2, repeat: Infinity, ease: 'linear' }}
          >
            {[world.emoji, '⭐', '✨', '🌟', '🎊', '💛'][i % 6]}
          </motion.div>
        ))}

        {/* Confetti burst from screen center */}
        {Array.from({ length: 22 }, (_, i) => {
          const angle = (i / 22) * Math.PI * 2;
          const r = 90 + (i % 4) * 35;
          return (
            <motion.div
              key={`cf-${i}`}
              className="fixed pointer-events-none"
              style={{
                width: `${5 + i % 4}px`, height: `${3 + i % 3}px`,
                background: ['#fbbf24','#f87171','#34d399','#60a5fa','#a78bfa','#fb7185'][i % 6],
                borderRadius: '1px', top: '50%', left: '50%', zIndex: 50,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r - 30, opacity: 0, scale: 1, rotate: (i % 2 === 0 ? 1 : -1) * (80 + i * 14) }}
              transition={{ duration: 0.65 + (i % 3) * 0.15, ease: 'easeOut', delay: i * 0.018 }}
            />
          );
        })}

        <motion.div
          className="relative z-10 max-w-sm w-full"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
          {/* Promoted piece banner — shown when promotion just happened */}
          {promotedPiece ? (
            <motion.div
              className="flex flex-col items-center mb-3"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.2 }}
            >
              <div className="text-2xl mb-1">👑</div>
              <ChessPieceIcon type={promotedPiece} size={64} />
              <p className="text-amber-700 font-bold mt-1 capitalize">
                The pawn became a {promotedPiece}!
              </p>
            </motion.div>
          ) : (
            /* World emoji pop */
            <motion.div
              className="text-4xl mb-1"
              initial={{ scale: 0, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.3 }}
            >
              {world.emoji}
            </motion.div>
          )}
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-1">
            {lastStars === 3 ? 'Perfect!' : lastStars === 2 ? 'Well done!' : 'You made it!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {level.captureAll
              ? <>Captured all shadows in <span className="font-bold text-amber-600">{moveCount}</span> move{moveCount !== 1 ? 's' : ''}.</>
              : <>Reached the flag in <span className="font-bold text-amber-600">{moveCount}</span> move{moveCount !== 1 ? 's' : ''}.</>
            }
          </p>

          {/* Contrast card — space worlds only */}
          {world.spaceTheme && level.contrastData && level.contrastData.length > 0 && (
            <motion.div
              className="rounded-2xl p-4 mb-4 text-left"
              style={{ background: 'rgba(30,27,75,0.7)', border: '1px solid rgba(129,140,248,0.35)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#818cf8' }}>
                Other Pieces
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ChessPieceIcon type={effectiveLevel.pieceType} size={20} />
                  <span className="text-sm font-bold text-white capitalize">{effectiveLevel.pieceType}</span>
                  <span className="ml-auto text-sm font-bold" style={{ color: '#fbbf24' }}>{moveCount} move{moveCount !== 1 ? 's' : ''}</span>
                  <span className="text-xs ml-1" style={{ color: '#86efac' }}>← you</span>
                </div>
                {level.contrastData.map(({ piece, moves }) => (
                  <div key={piece} className="flex items-center gap-2">
                    <ChessPieceIcon type={piece} size={20} />
                    <span className="text-sm capitalize" style={{ color: '#94a3b8' }}>{piece}</span>
                    <span className="ml-auto text-sm" style={{ color: '#64748b' }}>{moves} move{moves !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
              {level.contrastTakeaway && (
                <p className="mt-3 text-xs border-t pt-2" style={{ color: '#a5b4fc', borderColor: 'rgba(129,140,248,0.25)' }}>
                  💡 {level.contrastTakeaway}
                </p>
              )}
            </motion.div>
          )}

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

            <motion.button
              onClick={() => {
                const url = encodeBuiltinChallenge(worldId, levelIndex);
                navigator.clipboard?.writeText(url).catch(() => {});
              }}
              className="text-sm text-sky-600 border border-sky-300 rounded-xl px-4 py-2 bg-sky-50 hover:bg-sky-100 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              🔗 Copy challenge link
            </motion.button>
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
            onClick={() => setPlayPhase(remixLevel ? 'remix-offer' : 'done')}
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

  // ── Remix offer ──
  if (playPhase === 'remix-offer' && remixConfig && remixLevel && remixSourceLevel) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          {/* Piece swap visual */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col items-center gap-1">
              <ChessPieceIcon type={remixSourceLevel.pieceType} size={56} />
              <span className="text-xs text-gray-500 font-medium capitalize">{remixSourceLevel.pieceType}</span>
            </div>
            <motion.div
              className="text-3xl"
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              →
            </motion.div>
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <ChessPieceIcon type={remixConfig.remixPiece} size={56} />
                <div
                  className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: world.palette.accent, fontSize: '9px' }}
                >
                  NEW
                </div>
              </div>
              <span className="text-xs text-gray-500 font-medium capitalize">{remixConfig.remixPiece}</span>
            </div>
          </div>

          <div
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: world.palette.accent }}
          >
            Remix Challenge
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">
            Same Board. Different Piece.
          </h2>

          <div className="bg-white/60 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-gray-700">
            <span className="font-semibold">"{remixSourceLevel.name}"</span>
            <br />
            <span className="text-gray-500 italic mt-1 block">{remixConfig.contrast}</span>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Can the <span className="font-semibold capitalize">{remixConfig.remixPiece}</span> do better?
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={startRemix}
              className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
              style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              Try it! ✨
            </motion.button>

            <button
              onClick={() => setPlayPhase('done')}
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
            >
              Skip →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Remix playing ──
  if (playPhase === 'remix-playing' && remixLevel && remixConfig) {
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
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
              style={{ background: world.palette.accent }}
            >
              Remix
            </span>
            <span className="text-xs font-bold text-gray-500 capitalize">{remixConfig.remixPiece}</span>
          </div>
          <div className="text-xs text-gray-500 mb-0.5">{remixLevel.name}</div>
          <motion.span
            className="text-sm font-bold text-gray-700"
            key={remixMoveCount}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {remixMoveCount} move{remixMoveCount !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        {remixLevel.scrollAxis ? (
          <ScrollBoard
            key={`remix-${worldId}-${remixResetCount}`}
            level={remixLevel}
            consumedFood={remixConsumedFood}
            trail={remixTrail}
            squareSize={72}
            isMobile={false}
            onMove={handleRemixMove}
            onFoodConsumed={f => setRemixConsumedFood(prev => [...prev, f])}
            onStuck={setIsRemixStuck}
            showCheckerboard={worldId === 3}
            spaceTheme={world.spaceTheme}
          />
        ) : (
          <BoardShell
            key={`remix-${worldId}-${remixResetCount}`}
            level={remixLevel}
            consumedFood={remixConsumedFood}
            trail={remixTrail}
            squareSize={72}
            isMobile={false}
            onMove={handleRemixMove}
            onFoodConsumed={f => setRemixConsumedFood(prev => [...prev, f])}
            onStuck={setIsRemixStuck}
            showCheckerboard={worldId === 3}
            spaceTheme={world.spaceTheme}
          />
        )}

        {isRemixStuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            No moves left! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetRemix}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${
              isRemixStuck
                ? 'text-red-600 border-red-300 bg-red-50 font-semibold hover:bg-red-100'
                : 'text-gray-500 border-gray-300 hover:bg-white bg-white/60'
            }`}
          >
            ↺ Restart
          </button>
          <button
            onClick={() => setPlayPhase('remix-offer')}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Remix result ──
  if (playPhase === 'remix-result' && remixLevel && remixConfig && remixSourceLevel) {
    const originalOptimal = remixSourceLevel.starThresholds.three;
    const remixStarCount  = remixLastStars;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-4">Same Board. Two Pieces.</h2>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Original piece */}
            <div className="bg-white/60 border-2 border-white/40 rounded-2xl p-4 flex flex-col items-center gap-2">
              <ChessPieceIcon type={remixSourceLevel.pieceType} size={42} />
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide capitalize">
                {remixSourceLevel.pieceType}
              </div>
              <div className="text-xl font-extrabold text-gray-700">{originalOptimal}</div>
              <div className="text-xs text-gray-500">moves (best possible)</div>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(s => (
                  <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>

            {/* Remix piece */}
            <div
              className="border-2 rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{ background: `${world.palette.nodeColor}18`, borderColor: `${world.palette.nodeColor}60` }}
            >
              <ChessPieceIcon type={remixConfig.remixPiece} size={42} />
              <div className="text-xs font-bold uppercase tracking-wide capitalize" style={{ color: world.palette.accent }}>
                {remixConfig.remixPiece} · you!
              </div>
              <div className="text-xl font-extrabold text-gray-700">{remixMoveCount}</div>
              <div className="text-xs text-gray-500">moves</div>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(s => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= remixStarCount ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Insight */}
          <div className="bg-white/70 rounded-xl p-4 mb-6 text-sm text-gray-700 italic leading-relaxed">
            💡 "{remixConfig.insight}"
          </div>

          <motion.button
            onClick={() => setPlayPhase('done')}
            className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            Finish the Chapter 🏆
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

// ─── DuoWorldPlay ─────────────────────────────────────────────────────────────
// Handles two-piece cooperative worlds (no trial, no remix).

type DuoPlayPhase = 'intro' | 'playing' | 'celebration' | 'story' | 'done';

function DuoWorldPlay({
  worldId,
  completedWorlds,
  initialLevelIndex,
  onComplete,
  onBack,
}: {
  worldId: number;
  completedWorlds: number[];
  initialLevelIndex: number;
  onComplete: () => void;
  onBack: () => void;
}) {
  const world  = WORLDS[worldId];
  const levels: DuoLevel[] = DUO_WORLD_LEVELS[worldId] ?? [];

  const [playPhase,    setPlayPhase]    = useState<DuoPlayPhase>('intro');
  const [levelIndex,   setLevelIndex]   = useState(() =>
    Math.min(initialLevelIndex, Math.max(0, levels.length - 1))
  );
  const [consumedFood, setConsumedFood] = useState<Food[]>([]);
  const [totalMoves,   setTotalMoves]   = useState(0);
  const [resetCount,   setResetCount]   = useState(0);
  const [lastStars,    setLastStars]    = useState(0);
  const [isStuck,      setIsStuck]      = useState(false);

  const level      = levels[levelIndex];
  const isLastLevel = levelIndex === levels.length - 1;

  const startLevel = () => {
    setConsumedFood([]);
    setTotalMoves(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
    setPlayPhase('playing');
  };

  const resetBoard = () => {
    setConsumedFood([]);
    setTotalMoves(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
  };

  const handleNext = () => {
    if (isLastLevel) {
      setPlayPhase('story');
    } else {
      const next = levelIndex + 1;
      setLevelIndex(next);
      setConsumedFood([]);
      setTotalMoves(0);
      setResetCount(c => c + 1);
      setIsStuck(false);
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
          key={`duo-intro-${levelIndex}`}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-sm w-full"
        >
          {/* Show both pieces floating side-by-side */}
          <div className="flex justify-center items-end gap-8 mb-5">
            {level.pieces.map((p, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-1"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
              >
                <ChessPieceIcon type={p.pieceType} size={60} />
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: i === 0 ? '#f59e0b' : '#38bdf8' }}
                >
                  {p.pieceType}
                </span>
              </motion.div>
            ))}
          </div>

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
            key={totalMoves}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {totalMoves} move{totalMoves !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        <DuoBoard
          key={`duo-${worldId}-${levelIndex}-${resetCount}`}
          level={level}
          consumedFood={consumedFood}
          squareSize={72}
          isMobile={false}
          onMove={moves => setTotalMoves(moves)}
          onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
          onStuck={setIsStuck}
          onComplete={moves => {
            // DuoBoard already waited 600ms — just set stars and transition
            setLastStars(getStars(level.starThresholds, moves));
            setPlayPhase('celebration');
          }}
        />

        {isStuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            No moves left! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetBoard}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${
              isStuck
                ? 'text-red-600 border-red-300 bg-red-50 font-semibold hover:bg-red-100'
                : 'text-gray-500 border-gray-300 hover:bg-white bg-white/60'
            }`}
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
            Both pieces home in <span className="font-bold text-amber-600">{totalMoves}</span> move{totalMoves !== 1 ? 's' : ''}.
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

// ─── QueenWorldPlay ───────────────────────────────────────────────────────────
// Handles Queen's Realm (world 6): solo queen levels Q1-Q7, then duo finale Q8-Q9.
// No trial phase — the duo finale itself tests mastery.

type QueenPlayPhase =
  | 'intro' | 'playing' | 'celebration'
  | 'story' | 'remix-offer' | 'remix-playing' | 'remix-result' | 'done';

function QueenWorldPlay({
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
  const world = WORLDS[worldId];
  const soloLevels: Level[] = WORLD_LEVELS[worldId] ?? [];
  const SOLO_COUNT = soloLevels.length;           // 7 (Q1-Q7)
  const TOTAL_LEVELS = SOLO_COUNT + queenFinale.length; // 9

  const [playPhase, setPlayPhase] = useState<QueenPlayPhase>('intro');
  const [levelIndex, setLevelIndex] = useState(() =>
    Math.min(initialLevelIndex, Math.max(0, TOTAL_LEVELS - 1))
  );

  // Derived: which mode are we in?
  const isSolo = levelIndex < SOLO_COUNT;
  const isLastLevel = levelIndex === TOTAL_LEVELS - 1;
  const soloLevel  = soloLevels[Math.min(levelIndex, SOLO_COUNT - 1)];
  const duoLevel   = queenFinale[Math.max(0, levelIndex - SOLO_COUNT)];
  const curName    = isSolo ? soloLevel.name        : duoLevel.name;
  const curDesc    = isSolo ? soloLevel.description : duoLevel.description;
  const curHint    = isSolo ? soloLevel.hint        : duoLevel.hint;
  const curThresh  = isSolo ? soloLevel.starThresholds : duoLevel.starThresholds;

  // Solo board state
  const [moveCount,    setMoveCount]    = useState(0);
  const [trail,        setTrail]        = useState<Position[]>([soloLevels[0]?.start ?? { row: 0, col: 0 }]);
  const [consumedFood, setConsumedFood] = useState<Food[]>([]);
  const [resetCount,   setResetCount]   = useState(0);
  const [isStuck,      setIsStuck]      = useState(false);

  // Duo board state
  const [totalMoves,      setTotalMoves]      = useState(0);
  const [duoConsumedFood, setDuoConsumedFood] = useState<Food[]>([]);
  const [duoResetCount,   setDuoResetCount]   = useState(0);
  const [isDuoStuck,      setIsDuoStuck]      = useState(false);

  // Shared celebration state
  const [lastStars,     setLastStars]     = useState(0);
  const [lastMoveCount, setLastMoveCount] = useState(0);

  // Remix state
  const [isRemixStuck,      setIsRemixStuck]      = useState(false);
  const [remixMoveCount,    setRemixMoveCount]    = useState(0);
  const [remixLastStars,    setRemixLastStars]    = useState(0);
  const [remixResetCount,   setRemixResetCount]   = useState(0);
  const [remixConsumedFood, setRemixConsumedFood] = useState<Food[]>([]);
  const [remixTrail,        setRemixTrail]        = useState<Position[]>([]);

  const remixConfig      = REMIX_CONFIGS[worldId] ?? null;
  const remixSourceLevel = remixConfig ? (soloLevels[remixConfig.levelIndex] ?? null) : null;
  const remixLevel: Level | null = remixSourceLevel
    ? { ...remixSourceLevel, pieceType: remixConfig!.remixPiece }
    : null;

  // ── Ghost replay state (solo levels only) ────────────────────────────────
  const [ghostRoute, setGhostRoute] = useState<Position[] | null>(null);
  const [ghostStep,  setGhostStep]  = useState(0);
  const ghostPos = isSolo && ghostRoute ? (ghostRoute[ghostStep] ?? null) : null;

  useEffect(() => {
    if (!ghostRoute || !isSolo || playPhase !== 'playing' || ghostStep >= ghostRoute.length - 1) return;
    const t = setTimeout(() => setGhostStep(s => s + 1), 700);
    return () => clearTimeout(t);
  }, [ghostRoute, ghostStep, playPhase, isSolo]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const startLevel = () => {
    if (isSolo) {
      setConsumedFood([]);
      setTrail([soloLevel.start]);
      setMoveCount(0);
      setResetCount(c => c + 1);
      setIsStuck(false);
      // Ghost: show from attempt 3+ onward
      incrementAttempts(worldId, levelIndex);
      if (getAttempts(worldId, levelIndex) >= 3) {
        setGhostRoute(loadGhost(worldId, levelIndex));
      } else {
        setGhostRoute(null);
      }
      setGhostStep(0);
    } else {
      setDuoConsumedFood([]);
      setTotalMoves(0);
      setDuoResetCount(c => c + 1);
      setIsDuoStuck(false);
    }
    setPlayPhase('playing');
  };

  const resetBoard = () => {
    if (isSolo) {
      setConsumedFood([]);
      setTrail([soloLevel.start]);
      setMoveCount(0);
      setResetCount(c => c + 1);
      setIsStuck(false);
      setGhostStep(0);
    } else {
      setDuoConsumedFood([]);
      setTotalMoves(0);
      setDuoResetCount(c => c + 1);
      setIsDuoStuck(false);
    }
  };

  const startRemix = () => {
    if (!remixLevel) return;
    setRemixConsumedFood([]);
    setRemixTrail([remixLevel.start]);
    setRemixMoveCount(0);
    setRemixResetCount(c => c + 1);
    setIsRemixStuck(false);
    setPlayPhase('remix-playing');
  };

  const resetRemix = () => {
    if (!remixLevel) return;
    setRemixConsumedFood([]);
    setRemixTrail([remixLevel.start]);
    setRemixMoveCount(0);
    setRemixResetCount(c => c + 1);
    setIsRemixStuck(false);
  };

  const handleSoloMove = (newPos: Position) => {
    const newTrail = [...trail, newPos];
    setTrail(newTrail);
    const next = moveCount + 1;
    setMoveCount(next);
    if (newPos.row === soloLevel.goal.row && newPos.col === soloLevel.goal.col) {
      saveGhostIfBest(worldId, levelIndex, newTrail);
      setLastStars(getStars(soloLevel.starThresholds, next));
      setLastMoveCount(next);
      const pieceType = soloLevel.pieceType;
      setTimeout(() => {
        playCelebrationSound(pieceType);
        setPlayPhase('celebration');
      }, 600);
    }
  };

  const handleDuoComplete = (moves: number) => {
    // DuoBoard already waited 600ms internally
    setLastStars(getStars(duoLevel.starThresholds, moves));
    setLastMoveCount(moves);
    playCelebrationSound('queen');
    setPlayPhase('celebration');
  };

  const handleRemixMove = (newPos: Position) => {
    if (!remixLevel) return;
    setRemixTrail(prev => [...prev, newPos]);
    const next = remixMoveCount + 1;
    setRemixMoveCount(next);
    if (newPos.row === remixLevel.goal.row && newPos.col === remixLevel.goal.col) {
      setRemixLastStars(getStars(remixLevel.starThresholds, next));
      setTimeout(() => setPlayPhase('remix-result'), 600);
    }
  };

  const handleNext = () => {
    if (isLastLevel) {
      setPlayPhase('story');
    } else {
      const next = levelIndex + 1;
      setLevelIndex(next);
      const nextIsSolo = next < SOLO_COUNT;
      if (nextIsSolo) {
        const ns = soloLevels[next];
        setConsumedFood([]);
        setTrail([ns.start]);
        setMoveCount(0);
        setResetCount(c => c + 1);
        setIsStuck(false);
      } else {
        setDuoConsumedFood([]);
        setTotalMoves(0);
        setDuoResetCount(c => c + 1);
        setIsDuoStuck(false);
      }
      setGhostRoute(null);
      setGhostStep(0);
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
          key={`qintro-${levelIndex}`}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-sm w-full"
        >
          {isSolo ? (
            <motion.div
              className="mb-5 flex justify-center"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChessPieceIcon type={soloLevel.pieceType} size={70} />
            </motion.div>
          ) : (
            <div className="flex justify-center items-end gap-8 mb-5">
              {duoLevel.pieces.map((p, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center gap-1"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                >
                  <ChessPieceIcon type={p.pieceType} size={60} />
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: i === 0 ? '#f59e0b' : '#38bdf8' }}
                  >
                    {p.pieceType}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: world.palette.accent }}>
            {world.name} · Level {levelIndex + 1} of {TOTAL_LEVELS}
          </div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{curName}</h2>
          <p className="text-base text-gray-600 mb-4">{curDesc}</p>

          {curHint && (
            <div className="bg-white/60 border-2 border-sky-200 rounded-xl p-3 mb-4 text-sm text-sky-800">
              💡 {curHint}
            </div>
          )}

          <div className="bg-white/50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-800">
            <span className="font-semibold">3 ★</span> in {curThresh.three} move{curThresh.three !== 1 ? 's' : ''}
            {' · '}
            <span className="font-semibold">2 ★</span> in {curThresh.two}
          </div>

          {skipTrial && (
            <div className="flex gap-2 justify-center mb-4">
              <button
                onClick={() => {
                  const prev = Math.max(0, levelIndex - 1);
                  setLevelIndex(prev);
                  if (prev < SOLO_COUNT) {
                    const ps = soloLevels[prev];
                    setConsumedFood([]); setTrail([ps.start]); setMoveCount(0); setResetCount(c => c + 1);
                  }
                }}
                disabled={levelIndex === 0}
                className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 hover:bg-white cursor-pointer bg-white/40 disabled:opacity-30"
              >◀ Prev level</button>
              <span className="text-xs text-gray-400 self-center">👨 {levelIndex + 1}/{TOTAL_LEVELS}</span>
              <button
                onClick={() => {
                  const next = Math.min(TOTAL_LEVELS - 1, levelIndex + 1);
                  setLevelIndex(next);
                  if (next < SOLO_COUNT) {
                    const ns = soloLevels[next];
                    setConsumedFood([]); setTrail([ns.start]); setMoveCount(0); setResetCount(c => c + 1);
                  }
                }}
                disabled={levelIndex === TOTAL_LEVELS - 1}
                className="text-xs text-gray-400 border border-gray-200 rounded-lg px-3 py-1 hover:bg-white cursor-pointer bg-white/40 disabled:opacity-30"
              >Next level ▶</button>
            </div>
          )}

          <motion.button
            onClick={startLevel}
            className="w-full text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            {levelIndex === 0 ? "Let's Go! 👑" : 'Play! 👑'}
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
    const stuck = isSolo ? isStuck : isDuoStuck;
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
            {curName}
          </div>
          <motion.span
            className="text-sm font-bold text-gray-700"
            key={isSolo ? moveCount : totalMoves}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {isSolo ? moveCount : totalMoves} move{(isSolo ? moveCount : totalMoves) !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        {isSolo ? (
          soloLevel.scrollAxis ? (
            <ScrollBoard
              key={`queen-solo-${levelIndex}-${resetCount}`}
              level={soloLevel}
              consumedFood={consumedFood}
              trail={trail}
              squareSize={72}
              isMobile={false}
              onMove={handleSoloMove}
              onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
              onStuck={setIsStuck}
              ghostPos={ghostPos}
            />
          ) : (
            <BoardShell
              key={`queen-solo-${levelIndex}-${resetCount}`}
              level={soloLevel}
              consumedFood={consumedFood}
              trail={trail}
              squareSize={72}
              isMobile={false}
              onMove={handleSoloMove}
              onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
              onStuck={setIsStuck}
              ghostPos={ghostPos}
            />
          )
        ) : (
          <DuoBoard
            key={`queen-duo-${levelIndex}-${duoResetCount}`}
            level={duoLevel}
            consumedFood={duoConsumedFood}
            squareSize={72}
            isMobile={false}
            onMove={moves => setTotalMoves(moves)}
            onFoodConsumed={f => setDuoConsumedFood(prev => [...prev, f])}
            onStuck={setIsDuoStuck}
            onComplete={handleDuoComplete}
          />
        )}

        {stuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            No moves left! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetBoard}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${
              stuck
                ? 'text-red-600 border-red-300 bg-red-50 font-semibold hover:bg-red-100'
                : 'text-gray-500 border-gray-300 hover:bg-white bg-white/60'
            }`}
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
      <div className="min-h-screen bg-gradient-to-b from-purple-200 via-violet-100 to-yellow-100 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden">
        {/* Falling emoji stream */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl select-none pointer-events-none"
            style={{ left: `${(i * 8.5) % 100}vw` }}
            initial={{ y: -120, opacity: 1 }}
            animate={{ y: '110vh', rotate: Math.random() * 720 - 360, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 2, delay: Math.random() * 1.2, repeat: Infinity, ease: 'linear' }}
          >
            {['👑', '⭐', '✨', '🌟', '💜', '💫'][i % 6]}
          </motion.div>
        ))}

        {/* Confetti burst from screen center */}
        {Array.from({ length: 22 }, (_, i) => {
          const angle = (i / 22) * Math.PI * 2;
          const r = 90 + (i % 4) * 35;
          return (
            <motion.div
              key={`qcf-${i}`}
              className="fixed pointer-events-none"
              style={{
                width: `${5 + i % 4}px`, height: `${3 + i % 3}px`,
                background: ['#fbbf24','#c084fc','#f0abfc','#818cf8','#a78bfa','#fb7185'][i % 6],
                borderRadius: '1px', top: '50%', left: '50%', zIndex: 50,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
              animate={{ x: Math.cos(angle) * r, y: Math.sin(angle) * r - 30, opacity: 0, scale: 1, rotate: (i % 2 === 0 ? 1 : -1) * (80 + i * 14) }}
              transition={{ duration: 0.65 + (i % 3) * 0.15, ease: 'easeOut', delay: i * 0.018 }}
            />
          );
        })}

        <motion.div
          className="relative z-10 max-w-sm w-full"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
        >
          {/* World emoji pop */}
          <motion.div
            className="text-4xl mb-1"
            initial={{ scale: 0, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.3 }}
          >
            {world.emoji}
          </motion.div>
          <div className="text-5xl mb-2">👑</div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-1">
            {lastStars === 3 ? 'Perfect!' : lastStars === 2 ? 'Well done!' : 'You made it!'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isSolo
              ? <>Reached the flag in <span className="font-bold text-violet-600">{lastMoveCount}</span> move{lastMoveCount !== 1 ? 's' : ''}.</>
              : <>Both pieces home in <span className="font-bold text-violet-600">{lastMoveCount}</span> move{lastMoveCount !== 1 ? 's' : ''}.</>
            }
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
              className="text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
              style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
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
                className="font-semibold hover:underline cursor-pointer bg-transparent border-none text-sm"
                style={{ color: world.palette.accent }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                ↺ Try for 3 stars
              </motion.button>
            )}

            {isSolo && (
              <motion.button
                onClick={() => {
                  const url = encodeBuiltinChallenge(worldId, levelIndex);
                  navigator.clipboard?.writeText(url).catch(() => {});
                }}
                className="text-sm text-sky-600 border border-sky-300 rounded-xl px-4 py-2 bg-sky-50 hover:bg-sky-100 cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
              >
                🔗 Copy challenge link
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
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
            onClick={() => setPlayPhase(remixLevel ? 'remix-offer' : 'done')}
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

  // ── Remix offer ──
  if (playPhase === 'remix-offer' && remixConfig && remixLevel && remixSourceLevel) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex flex-col items-center gap-1">
              <ChessPieceIcon type={remixSourceLevel.pieceType} size={56} />
              <span className="text-xs text-gray-500 font-medium capitalize">{remixSourceLevel.pieceType}</span>
            </div>
            <motion.div className="text-3xl" animate={{ x: [0, 6, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
              →
            </motion.div>
            <div className="flex flex-col items-center gap-1">
              <div className="relative">
                <ChessPieceIcon type={remixConfig.remixPiece} size={56} />
                <div
                  className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: world.palette.accent, fontSize: '9px' }}
                >NEW</div>
              </div>
              <span className="text-xs text-gray-500 font-medium capitalize">{remixConfig.remixPiece}</span>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: world.palette.accent }}>
            Remix Challenge
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Same Board. Different Piece.</h2>

          <div className="bg-white/60 border border-amber-200 rounded-xl p-3 mb-3 text-sm text-gray-700">
            <span className="font-semibold">"{remixSourceLevel.name}"</span><br />
            <span className="text-gray-500 italic mt-1 block">{remixConfig.contrast}</span>
          </div>

          <p className="text-gray-600 text-sm mb-6">
            Can the <span className="font-semibold capitalize">{remixConfig.remixPiece}</span> do better?
          </p>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={startRemix}
              className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
              style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              Try it! ✨
            </motion.button>
            <button
              onClick={() => setPlayPhase('done')}
              className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
            >
              Skip →
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Remix playing ──
  if (playPhase === 'remix-playing' && remixLevel && remixConfig) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 select-none"
        style={{ background: world.palette.bg }}
      >
        <motion.div className="text-center" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center justify-center gap-2 mb-0.5">
            <span
              className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white"
              style={{ background: world.palette.accent }}
            >Remix</span>
            <span className="text-xs font-bold text-gray-500 capitalize">{remixConfig.remixPiece}</span>
          </div>
          <div className="text-xs text-gray-500 mb-0.5">{remixLevel.name}</div>
          <motion.span
            className="text-sm font-bold text-gray-700"
            key={remixMoveCount}
            animate={{ scale: [1.2, 1] }}
            transition={{ duration: 0.15 }}
          >
            {remixMoveCount} move{remixMoveCount !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        {remixLevel.scrollAxis ? (
          <ScrollBoard
            key={`q-remix-${remixResetCount}`}
            level={remixLevel}
            consumedFood={remixConsumedFood}
            trail={remixTrail}
            squareSize={72}
            isMobile={false}
            onMove={handleRemixMove}
            onFoodConsumed={f => setRemixConsumedFood(prev => [...prev, f])}
            onStuck={setIsRemixStuck}
          />
        ) : (
          <BoardShell
            key={`q-remix-${remixResetCount}`}
            level={remixLevel}
            consumedFood={remixConsumedFood}
            trail={remixTrail}
            squareSize={72}
            isMobile={false}
            onMove={handleRemixMove}
            onFoodConsumed={f => setRemixConsumedFood(prev => [...prev, f])}
            onStuck={setIsRemixStuck}
          />
        )}

        {isRemixStuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            No moves left! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetRemix}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${
              isRemixStuck
                ? 'text-red-600 border-red-300 bg-red-50 font-semibold hover:bg-red-100'
                : 'text-gray-500 border-gray-300 hover:bg-white bg-white/60'
            }`}
          >
            ↺ Restart
          </button>
          <button
            onClick={() => setPlayPhase('remix-offer')}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Remix result ──
  if (playPhase === 'remix-result' && remixLevel && remixConfig && remixSourceLevel) {
    const originalOptimal = remixSourceLevel.starThresholds.three;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        >
          <div className="text-4xl mb-3">🔄</div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-4">Same Board. Two Pieces.</h2>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white/60 border-2 border-white/40 rounded-2xl p-4 flex flex-col items-center gap-2">
              <ChessPieceIcon type={remixSourceLevel.pieceType} size={42} />
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide capitalize">
                {remixSourceLevel.pieceType}
              </div>
              <div className="text-xl font-extrabold text-gray-700">{originalOptimal}</div>
              <div className="text-xs text-gray-500">moves (best possible)</div>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(s => <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
            </div>
            <div
              className="border-2 rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{ background: `${world.palette.nodeColor}18`, borderColor: `${world.palette.nodeColor}60` }}
            >
              <ChessPieceIcon type={remixConfig.remixPiece} size={42} />
              <div className="text-xs font-bold uppercase tracking-wide capitalize" style={{ color: world.palette.accent }}>
                {remixConfig.remixPiece} · you!
              </div>
              <div className="text-xl font-extrabold text-gray-700">{remixMoveCount}</div>
              <div className="text-xs text-gray-500">moves</div>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(s => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= remixLastStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white/70 rounded-xl p-4 mb-6 text-sm text-gray-700 italic leading-relaxed">
            💡 "{remixConfig.insight}"
          </div>

          <motion.button
            onClick={() => setPlayPhase('done')}
            className="w-full text-white font-bold text-lg py-4 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            Finish the Chapter 🏆
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
        <div className="text-7xl mb-4">👑</div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">{world.name} Complete!</h2>
        <p className="text-gray-600 mb-4">
          You've brought the whole party together. Well done!
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
            onClick={() => { setLevelIndex(0); setPlayPhase('intro'); }}
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

// ─── ChallengePlay ────────────────────────────────────────────────────────────
// Streamlined single-level player for Shifting Grounds challenge levels.
// No trial, no story beat, no remix — just the level, a celebration, and back.

function ChallengePlay({
  worldId,
  onComplete,
  onBack,
}: {
  worldId: number;
  onComplete: () => void;
  onBack: () => void;
}) {
  const world = WORLDS[worldId];
  const level = CHALLENGE_LEVELS[worldId];

  type CPhase = 'intro' | 'playing' | 'celebration';
  const [cPhase,         setCPhase]         = useState<CPhase>('intro');
  const [consumedFood,   setConsumedFood]   = useState<Food[]>([]);
  const [capturedEnemies,setCapturedEnemies]= useState<Enemy[]>([]);
  const [trail,          setTrail]          = useState<Position[]>([level.start]);
  const [moveCount,      setMoveCount]      = useState(0);
  const [resetCount,     setResetCount]     = useState(0);
  const [isStuck,        setIsStuck]        = useState(false);
  const [lastStars,      setLastStars]      = useState(0);

  const startChallenge = () => {
    setConsumedFood([]);
    setCapturedEnemies([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
    setCPhase('playing');
  };

  const resetChallenge = () => {
    setConsumedFood([]);
    setCapturedEnemies([]);
    setTrail([level.start]);
    setMoveCount(0);
    setResetCount(c => c + 1);
    setIsStuck(false);
  };

  const handleMove = (newPos: Position, capturedEnemy?: Enemy) => {
    const newTrail = [...trail, newPos];
    setTrail(newTrail);
    const next = moveCount + 1;
    setMoveCount(next);
    if (capturedEnemy) {
      setCapturedEnemies(prev => [...prev, capturedEnemy]);
      return;
    }
    if (newPos.row === level.goal.row && newPos.col === level.goal.col) {
      setLastStars(getStars(level.starThresholds, next));
      setTimeout(() => {
        playCelebrationSound(level.pieceType);
        setCPhase('celebration');
      }, 600);
    }
  };

  // ── Intro ──
  if (cPhase === 'intro') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full flex flex-col items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="text-3xl mb-1 select-none">❄️</div>
          <div className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60" style={{ color: world.palette.accent }}>
            Shifting Grounds · {world.name}
          </div>
          <motion.div className="mb-5" animate={{ y: [0, -10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
            <ChessPieceIcon type={level.pieceType} size={80} />
          </motion.div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">{level.name}</h2>
          <p className="text-base text-gray-600 leading-relaxed mb-4">{level.description}</p>
          {level.hint && (
            <div className="bg-white/70 border-2 border-sky-200 rounded-2xl p-3 mb-5 text-sm text-sky-800 w-full">
              💡 {level.hint}
            </div>
          )}
          <div className="text-xs text-amber-700 bg-white/50 rounded-xl px-3 py-2 mb-6">
            <span className="font-semibold">3 ★</span> in {level.starThresholds.three} moves
            {' · '}
            <span className="font-semibold">2 ★</span> in {level.starThresholds.two}
          </div>
          <motion.button
            onClick={startChallenge}
            className="w-full text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Accept the Challenge ❄️
          </motion.button>
          <button onClick={onBack} className="mt-4 text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none">
            ← World Map
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Playing ──
  if (cPhase === 'playing') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 select-none"
        style={{ background: world.palette.bg }}
      >
        <motion.div className="text-center" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: world.palette.accent }}>
            {level.name}
          </div>
          <motion.span className="text-sm font-bold text-gray-700" key={moveCount} animate={{ scale: [1.2, 1] }} transition={{ duration: 0.15 }}>
            {moveCount} move{moveCount !== 1 ? 's' : ''}
          </motion.span>
        </motion.div>

        <BoardShell
          key={`challenge-${worldId}-${resetCount}`}
          level={level}
          consumedFood={consumedFood}
          trail={trail}
          squareSize={72}
          isMobile={false}
          onMove={handleMove}
          onFoodConsumed={f => setConsumedFood(prev => [...prev, f])}
          onStuck={setIsStuck}
          capturedEnemies={capturedEnemies}
        />

        {isStuck && (
          <motion.div
            className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 font-semibold"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          >
            Sealed in! Press Restart ↺
          </motion.div>
        )}

        <div className="flex gap-3">
          <button
            onClick={resetChallenge}
            className={`text-sm border rounded-xl px-4 py-2 cursor-pointer transition-colors ${isStuck ? 'bg-red-100 border-red-300 text-red-700 font-bold' : 'bg-white/60 border-gray-200 text-gray-600 hover:bg-white'}`}
          >
            ↺ Restart
          </button>
          <button onClick={onBack} className="text-sm bg-white/60 border border-gray-200 text-gray-600 rounded-xl px-4 py-2 hover:bg-white cursor-pointer">
            ← Map
          </button>
        </div>
      </div>
    );
  }

  // ── Celebration ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-sky-50 to-indigo-100 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl select-none pointer-events-none"
          style={{ left: `${(i * 10.5) % 100}vw` }}
          initial={{ y: -80, opacity: 1 }}
          animate={{ y: '110vh', opacity: [1, 1, 0] }}
          transition={{ duration: 2.5 + Math.random(), delay: Math.random() * 0.8, repeat: Infinity, ease: 'linear' }}
        >
          {['❄️', '⭐', '✨', '❄️', '🌟', '⭐'][i % 6]}
        </motion.div>
      ))}
      <motion.div
        className="relative z-10 max-w-sm w-full"
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <div className="text-5xl mb-3">❄️</div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-1">
          {lastStars === 3 ? 'Perfect!' : lastStars === 2 ? 'Cleared!' : 'You made it!'}
        </h2>
        <p className="text-gray-600 mb-4">
          Challenge cleared in <span className="font-bold text-sky-600">{moveCount}</span> move{moveCount !== 1 ? 's' : ''}.
        </p>
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <motion.div key={s} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 + s * 0.12 }}>
              <Star className={`w-10 h-10 ${s <= lastStars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onComplete}
            className="text-white font-bold text-lg py-3 rounded-2xl shadow-lg cursor-pointer"
            style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
          >
            Back to World Map 🗺️
          </button>
          {lastStars < 3 && (
            <button onClick={startChallenge} className="text-sky-600 font-semibold text-sm hover:underline cursor-pointer bg-transparent border-none">
              ↺ Try for 3 stars
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── FirstBoardGallery ────────────────────────────────────────────────────────

function FirstBoardGallery({
  onDone,
  onBack,
}: {
  onDone: () => void;
  onBack: () => void;
}) {
  const [galPhase, setGalPhase] = useState<'story' | 'gallery'>('story');
  const squareSize = Math.min(42, Math.floor((Math.min(window.innerWidth, 600) - 48) / 8));

  if (galPhase === 'story') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 select-none"
        style={{ background: 'linear-gradient(to bottom, #fef3c7, #fde68a, #d97706)' }}
      >
        <motion.div
          className="w-full max-w-sm bg-white/90 rounded-3xl shadow-2xl p-7 flex flex-col items-center gap-5 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <div className="text-5xl">♟️</div>
          <h2 className="text-2xl font-extrabold text-amber-900">The First Board</h2>
          <p className="text-gray-700 leading-relaxed">
            You have met every piece — King, Pawn, Rook, Bishop, Knight, and Queen.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Now you stand before the board they all share: the great 8×8 that chess was born on.
          </p>
          <p className="text-gray-600 text-sm">
            Explore how each piece moves here, then play.
          </p>
          <motion.button
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg py-3 rounded-2xl shadow-lg cursor-pointer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setGalPhase('gallery')}
          >
            Explore the Board →
          </motion.button>
          <button
            onClick={onBack}
            className="text-sm text-amber-700/60 hover:text-amber-800 bg-transparent border-none cursor-pointer"
          >
            ← World Map
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start gap-4 p-4 pt-8 select-none overflow-auto"
      style={{ background: 'linear-gradient(to bottom, #fef3c7, #fde68a, #d97706)' }}
    >
      <motion.div
        className="text-center mb-1"
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h2 className="text-xl font-extrabold text-amber-900">Meet the Pieces</h2>
        <p className="text-xs text-amber-700 mt-0.5">Tap each piece to see where it can go</p>
      </motion.div>
      <GalleryBoard squareSize={squareSize} onDone={onDone} />
    </div>
  );
}

// ─── TitleScreen ──────────────────────────────────────────────────────────────

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

        <div className="relative inline-block mb-2">
          <h1
            className="text-5xl font-extrabold text-white leading-tight"
            style={{ textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
          >
            The Friendship Kingdom
          </h1>
          {/* Shimmer streak that sweeps the title periodically */}
          <motion.div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background: 'linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.45) 50%, transparent 80%)',
              mixBlendMode: 'overlay',
            }}
            initial={{ x: '-110%' }}
            animate={{ x: '110%' }}
            transition={{ duration: 1.1, ease: 'easeInOut', delay: 1.2, repeat: Infinity, repeatDelay: 4.5 }}
          />
        </div>

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

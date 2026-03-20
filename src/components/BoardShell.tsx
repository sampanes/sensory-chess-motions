import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag } from 'lucide-react';
import { Level, PieceType, Position, Food, Enemy, PatrolPiece } from '../types';
import { getValidMoves, isValidMove } from '../utils/moveCalculator';
import { getSentinelThreat, getAllThreats, computeGuardThreat } from '../utils/threatZone';
import { playCrunchSound, playWompSound, playMoveSound } from '../utils/sounds';
import { ChessPieceIcon } from './ChessPieceIcon';


function getDecoration(r: number, c: number, spaceTheme?: boolean): string | null {
  const hash = Math.abs((r * 31) ^ (c * 37)) % 14;
  if (spaceTheme) {
    if (hash === 1) return '✨';
    if (hash === 2) return '🪐';
    if (hash === 3) return '🛰️';
    return null; // sparser in space
  }
  if (hash === 1) return '🌱';
  if (hash === 2) return '🌼';
  if (hash === 3) return '🍀';
  if (hash === 4) return '🌿';
  return null;
}

export interface BoardShellProps {
  level: Level;
  consumedFood: Position[];
  trail: Position[];
  squareSize: number;
  isMobile: boolean;
  onMove: (newPos: Position, capturedEnemy?: Enemy) => void;
  onFoodConsumed: (food: Food) => void;
  onStuck: (stuck: boolean) => void;
  /** Optional CSS custom properties for world theming, e.g. adventure mode palettes */
  worldTheme?: React.CSSProperties;
  /** When true, adds a subtle violet tint to light squares (bishop world checkerboard) */
  showCheckerboard?: boolean;
  /** Ghost replay position — translucent copy of the piece at this cell (null = hidden) */
  ghostPos?: Position | null;
  /** When true, applies space visual theme: void rifts, fuel cells, cyan move rings */
  spaceTheme?: boolean;
  /** Enemy pieces on the board (shadow world). Treated as capturable food. */
  enemies?: Enemy[];
  /** Enemies already captured this run — excluded from rendering and obstacles. */
  capturedEnemies?: Enemy[];
  /** Override board row count (default: level.boardHeight ?? 5) */
  boardRows?: number;
  /** Override board col count (default: level.boardWidth ?? 5) */
  boardCols?: number;
  /** When false, suppresses click handling and valid-move circles (display-only mode). */
  interactive?: boolean;
  /** When set, overrides internal piecePos for rendering (used by Oracle auto-play). */
  externalPiecePos?: Position;
  /** When set, overrides level.pieceType for the displayed piece icon. */
  displayPieceType?: PieceType;
  /** Patrol pieces for this level — rendered at their current route position. */
  patrolPieces?: PatrolPiece[];
  /** Called whenever sentinel step indices change — used by parent for trap-mode win detection. */
  onSentinelStepsChange?: (steps: number[]) => void;
  /** When true: interactive is forced off; BoardShell auto-advances sentinels one full cycle. */
  watchPhaseActive?: boolean;
  /** Called when one full sentinel cycle has completed during Watch Phase. */
  onWatchPhaseComplete?: () => void;
  /** Position of the enemy king in trapMode levels. */
  kingPos?: Position | null;
  /** When true, plays the king collapse animation (scale down + fade). */
  kingCollapsing?: boolean;
}

export function BoardShell({
  level,
  consumedFood,
  trail,
  squareSize,
  isMobile,
  onMove,
  onFoodConsumed,
  onStuck,
  worldTheme,
  showCheckerboard,
  ghostPos,
  spaceTheme,
  enemies = [],
  capturedEnemies = [],
  boardRows: boardRowsProp,
  boardCols: boardColsProp,
  interactive = true,
  externalPiecePos,
  displayPieceType,
  patrolPieces,
  onSentinelStepsChange,
  watchPhaseActive,
  onWatchPhaseComplete,
  kingPos,
  kingCollapsing = false,
}: BoardShellProps) {
  // ── Sentinel state (internal — BoardShell owns the advance clock) ──────────
  const [sentinelSteps, setSentinelSteps] = useState<number[]>(
    () => (patrolPieces ?? []).map(p => p.startIndex ?? 0),
  );
  const [sweepPreview, setSweepPreview]   = useState<Position[]>([]);
  const [caughtBy,     setCaughtBy]       = useState<number | null>(null);
  const [catchActive,  setCatchActive]    = useState(false);
  const [nearMiss,     setNearMiss]       = useState<Position | null>(null);
  const [cleanEscape,  setCleanEscape]    = useState(false);
  const prevPosRef = useRef<Position>(level.start);
  const numRows = boardRowsProp ?? level.boardHeight ?? 5;
  const numCols = boardColsProp ?? level.boardWidth ?? 5;
  const [piecePos, setPiecePos] = useState<Position>(level.start);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [animKey, setAnimKey] = useState(0);
  const [suggestedMove, setSuggestedMove] = useState<Position | null>(null);
  const [mobileCoach, setMobileCoach] = useState<string | null>(null);
  // Dynamic river sealing state
  const [sealedRivers, setSealedRivers] = useState<Position[]>([]);
  const [sealingCells, setSealingCells] = useState<Position[]>([]); // currently flashing ice-blue

  // King escape squares — computed once from kingPos (shown as amber circles when showKingEscapes is on)
  const kingEscapeSquares: Position[] = (level.showKingEscapes && kingPos)
    ? getValidMoves('king', kingPos, { fences: [], rivers: [], bridges: [], food: [] }, [], numRows, numCols)
    : [];

  // ---------------------------------------------------------------------------
  // Derived cell queries
  // ---------------------------------------------------------------------------
  const isRiver  = (r: number, c: number) =>
    level.obstacles.rivers.some(rv => rv.row === r && rv.col === c) ||
    sealedRivers.some(sr => sr.row === r && sr.col === c);
  const isBridge = (r: number, c: number) =>
    level.obstacles.bridges.some(b => b.row === r && b.col === c) &&
    !sealedRivers.some(sr => sr.row === r && sr.col === c);
  const isSealing = (r: number, c: number) => sealingCells.some(s => s.row === r && s.col === c);
  const isGoal   = (r: number, c: number) => level.goal.row === r && level.goal.col === c;
  const isTrail  = (r: number, c: number) => trail.some(t => t.row === r && t.col === c);
  const hasFence = (r: number, c: number, side: string) =>
    level.obstacles.fences.some(f => f.row === r && f.col === c && f.side === side);
  const isValid  = (r: number, c: number) => interactive && validMoves.some(m => m.row === r && m.col === c);
  const displayPos = externalPiecePos ?? piecePos;
  const isPiece  = (r: number, c: number) => displayPos.row === r && displayPos.col === c;
  const isFoodConsumed = (pos: Position) =>
    consumedFood.some(f => f.row === pos.row && f.col === pos.col);

  const getSquareClasses = (r: number, c: number) => {
    if (isRiver(r, c) && !isBridge(r, c)) return spaceTheme ? 'bg-slate-950' : 'bg-blue-400';
    if (isRiver(r, c) && isBridge(r, c))  return spaceTheme ? 'bg-slate-900' : 'bg-amber-500';
    if (spaceTheme) return (r + c) % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700';
    return (r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400';
  };

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  // ---------------------------------------------------------------------------
  // Recompute valid moves whenever piece position or consumed food changes.
  // Stuck detection fires only after at least one move (animKey > 0).
  // ---------------------------------------------------------------------------
  // Live enemies are treated as food for move calculation: sliders stop on them,
  // pawns can diagonal-capture them. Captured enemies are removed.
  const liveEnemies = enemies.filter(
    e => !capturedEnemies.some(ce => ce.row === e.row && ce.col === e.col)
  );

  useEffect(() => {
    // Guard pieces and their threat zones are impassable — merge into obstacles.rivers.
    // Knights ignore them naturally (they jump rivers). watchedSquares kept for Q8/Q9.
    const baseRivers = [
      ...level.obstacles.rivers,
      ...computeGuardThreat(level.guardPieces ?? [], numRows, numCols),
      ...(level.watchedSquares ?? []),
      ...sealedRivers,
    ];
    const baseBridges = level.obstacles.bridges.filter(
      b => !sealedRivers.some(sr => sr.row === b.row && sr.col === b.col)
    );
    const baseObstacles = { ...level.obstacles, rivers: baseRivers, bridges: baseBridges };
    // Merge live enemies into food so the move calculator treats them correctly
    const effectiveObstacles = liveEnemies.length
      ? { ...baseObstacles, food: [...baseObstacles.food, ...liveEnemies] }
      : baseObstacles;
    // Captured enemies count as consumed food so sliders can pass through vacated squares
    const effectiveConsumedFood = [...consumedFood, ...capturedEnemies];
    const moves = getValidMoves(level.pieceType, piecePos, effectiveObstacles, effectiveConsumedFood, numRows, numCols);
    setValidMoves(moves);

    const allCaptured = level.captureAll
      ? capturedEnemies.length >= (level.enemies?.length ?? 0)
      : false;
    const atGoal = allCaptured || (!level.captureAll && piecePos.row === level.goal.row && piecePos.col === level.goal.col);
    if (moves.length === 0 && animKey > 0 && !atGoal) {
      onStuck(true);
      playWompSound();
      triggerHaptic([80, 60, 120]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecePos, consumedFood, capturedEnemies, sealedRivers]);

  // ---------------------------------------------------------------------------
  // Dynamic river sealing — check on each move whether new cells should freeze.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!level.dynamicRivers?.length || animKey === 0) return;
    const newCells = level.dynamicRivers.filter(dr => dr.appearsOnMove === animKey);
    if (!newCells.length) return;
    const positions = newCells.map(({ row, col }) => ({ row, col }));
    setSealingCells(prev => [...prev, ...positions]);
    const t = setTimeout(() => {
      setSealedRivers(prev => [...prev, ...positions]);
      setSealingCells(prev => prev.filter(sc => !positions.some(p => p.row === sc.row && p.col === sc.col)));
    }, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // ---------------------------------------------------------------------------
  // Catch-sequence reset
  // ---------------------------------------------------------------------------
  const handleCatchReset = () => {
    setPiecePos(level.start);
    setSentinelSteps((patrolPieces ?? []).map(p => p.startIndex ?? 0));
    setSweepPreview([]);
    setCaughtBy(null);
    setCatchActive(false);
    setNearMiss(null);
    setCleanEscape(false);
    setAnimKey(0);
    prevPosRef.current = level.start;
  };

  // Auto-restart after 2200ms if the player doesn't tap "Try again"
  useEffect(() => {
    if (!catchActive) return;
    const t = setTimeout(() => handleCatchReset(), 2200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catchActive]);

  // ---------------------------------------------------------------------------
  // Advance logic — fires after each player move (animKey change)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (animKey === 0 || !patrolPieces?.length) return;

    const resolveIdx = (patrol: PatrolPiece, mirrorIdx: number) => {
      const len = patrol.route.length;
      if (patrol.routeMode === 'loop') return mirrorIdx % len;
      return mirrorIdx < len ? mirrorIdx : 2 * (len - 1) - mirrorIdx;
    };

    // Step 1: compute next mirror-step indices
    const nextSteps = sentinelSteps.map((step, i) => {
      const patrol = patrolPieces[i];
      const len = patrol.route.length;
      if (len <= 1) return 0;
      if (patrol.routeMode === 'loop') return (step + 1) % len;
      const full = 2 * (len - 1);
      return (step + 1) % full;
    });

    // Step 2: show sweep preview (what will be threatened after the advance)
    const previewZones = nextSteps.flatMap((s, i) => {
      const patrol = patrolPieces[i];
      return getSentinelThreat(patrol, resolveIdx(patrol, s), numRows, numCols);
    });
    setSweepPreview(previewZones);

    // Step 3: 300ms later, apply the advance and run catch/near-miss checks
    const advanceTimer = setTimeout(() => {
      setSweepPreview([]);
      setSentinelSteps(nextSteps);
      onSentinelStepsChange?.(nextSteps);

      // Caught check: is the player's current position now in a threat zone?
      const currentPos = piecePos;
      for (let i = 0; i < patrolPieces.length; i++) {
        const zone = getSentinelThreat(patrolPieces[i], resolveIdx(patrolPieces[i], nextSteps[i]), numRows, numCols);
        if (zone.some(sq => sq.row === currentPos.row && sq.col === currentPos.col)) {
          setCaughtBy(i);
          setCatchActive(true);
          return;
        }
      }

      // Near-miss check: is the player's previous position now threatened?
      const prev = prevPosRef.current;
      for (let i = 0; i < patrolPieces.length; i++) {
        const zone = getSentinelThreat(patrolPieces[i], resolveIdx(patrolPieces[i], nextSteps[i]), numRows, numCols);
        if (zone.some(sq => sq.row === prev.row && sq.col === prev.col)) {
          setNearMiss(prev);
          setTimeout(() => setNearMiss(null), 750);
          break;
        }
      }
    }, 300);

    return () => clearTimeout(advanceTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  // ---------------------------------------------------------------------------
  // Watch Phase auto-advance — runs one full sentinel cycle at 600ms/step
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!watchPhaseActive || !patrolPieces?.length) return;

    const patrol = patrolPieces[0];
    const len = patrol.route.length;
    const cycleLength = patrol.routeMode === 'loop' ? len : 2 * (len - 1);

    let stepCount = 0;
    const tick = setInterval(() => {
      stepCount++;
      setSentinelSteps(prev => prev.map((s, i) => {
        const p = (patrolPieces ?? [])[i];
        const pLen = p.route.length;
        if (pLen <= 1) return 0;
        if (p.routeMode === 'loop') return (s + 1) % pLen;
        const full = 2 * (pLen - 1);
        return (s + 1) % full;
      }));
      if (stepCount >= cycleLength) {
        clearInterval(tick);
        onWatchPhaseComplete?.();
      }
    }, 600);

    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchPhaseActive]);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------
  const handleSquareClick = (row: number, col: number) => {
    if (!interactive) return;
    if (watchPhaseActive) return;
    if (catchActive) return;
    if (!isValidMove(validMoves, row, col)) {
      if (isMobile && validMoves.length > 0) {
        const nearest = validMoves.reduce((best, candidate) => {
          const bd = Math.abs(best.row - row) + Math.abs(best.col - col);
          const cd = Math.abs(candidate.row - row) + Math.abs(candidate.col - col);
          return cd < bd ? candidate : best;
        }, validMoves[0]);
        setSuggestedMove(nearest);
        setMobileCoach('Try one of the glowing circles ✨');
        triggerHaptic(24);
      }
      return;
    }

    const newPos = { row, col };
    setSuggestedMove(null);
    setMobileCoach(null);
    triggerHaptic(10);

    // Clean-escape: moving from a threatened square to a safe one
    if (patrolPieces?.length) {
      const currentThreats = getAllThreats(patrolPieces, sentinelSteps, numRows, numCols);
      const wasInThreat = currentThreats.some(sq => sq.row === piecePos.row && sq.col === piecePos.col);
      const newIsSafe   = !currentThreats.some(sq => sq.row === row && sq.col === col);
      if (wasInThreat && newIsSafe) {
        setCleanEscape(true);
        setTimeout(() => setCleanEscape(false), 500);
      }
    }

    prevPosRef.current = piecePos;
    setPiecePos(newPos);
    setAnimKey(prev => prev + 1);
    onStuck(false);

    const capturedEnemy = liveEnemies.find(e => e.row === row && e.col === col);
    const eatenFood = level.obstacles.food.find(f => f.row === row && f.col === col);
    if (capturedEnemy) {
      playCrunchSound();
    } else if (eatenFood) {
      onFoodConsumed(eatenFood);
      playCrunchSound();
    } else {
      playMoveSound(level.pieceType);
    }

    onMove(newPos, capturedEnemy);
  };

  const boardW = squareSize * numCols;
  const boardH = squareSize * numRows;

  // Precompute guard threat set for cell-loop rendering
  const guardThreatPositions = computeGuardThreat(level.guardPieces ?? [], numRows, numCols);
  const guardThreatSet = new Set(guardThreatPositions.map(p => `${p.row},${p.col}`));
  const isGuardSquare = (r: number, c: number) =>
    level.guardPieces?.some(g => g.position.row === r && g.position.col === c) ?? false;

  return (
    <>
      <motion.div
        className="relative rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{ width: `${boardW}px`, height: `${boardH}px`, ...worldTheme }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {/* grid */}
        <div
          className="grid absolute inset-0"
          style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}
        >
          {Array.from({ length: numRows * numCols }, (_, i) => {
            const r = Math.floor(i / numCols);
            const c = i % numCols;
            const river      = isRiver(r, c);
            const bridge     = isBridge(r, c);
            const goal       = isGoal(r, c);
            const valid      = isValid(r, c);
            const suggested  = suggestedMove?.row === r && suggestedMove?.col === c;
            const piece      = isPiece(r, c);
            const inTrail    = isTrail(r, c) && !piece;
            const decoration = !river && !bridge && !goal && !piece ? getDecoration(r, c, spaceTheme) : null;

            return (
              <motion.div
                key={`${r}-${c}`}
                className={`relative ${getSquareClasses(r, c)} ${valid ? 'cursor-pointer' : ''}`}
                style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
                onClick={() => handleSquareClick(r, c)}
                whileHover={valid ? { scale: 1.03 } : {}}
              >
                {!river && !bridge && !spaceTheme && (
                  <div className={`absolute inset-0 ${(r + c) % 2 === 0 ? 'grass-light' : 'grass-dark'}`} />
                )}

                {!river && !bridge && showCheckerboard && (r + c) % 2 === 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(139,92,246,0.13)' }} />
                )}

                {/* Guard piece threat zone — shown on threatened cells, not on the guard itself */}
                {!river && !bridge && guardThreatSet.has(`${r},${c}`) && !isGuardSquare(r, c) && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: 'rgba(239,68,68,0.20)' }} />
                )}

                {/* Legacy watchedSquares overlay — kept for Q8/Q9 duo levels */}
                {!river && !bridge && level.watchedSquares?.some(ws => ws.row === r && ws.col === c) && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.22)' }}>
                    <span className="text-xs opacity-40 select-none">👁</span>
                  </div>
                )}

                {river && !bridge && !spaceTheme && (
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

                {river && !bridge && spaceTheme && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {bridge && !spaceTheme && (
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

                {bridge && spaceTheme && (
                  <div className="absolute inset-0">
                    <div className="absolute inset-1 rounded-md border border-cyan-400/50" style={{ boxShadow: '0 0 8px rgba(34,211,238,0.4) inset' }} />
                    {[1, 2, 3].map(j => (
                      <div
                        key={j}
                        className="absolute rounded-sm"
                        style={{ width: '80%', height: '2px', top: `${15 + j * 22}%`, left: '10%', background: 'rgba(34,211,238,0.35)' }}
                      />
                    ))}
                  </div>
                )}

                {decoration && !inTrail && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm opacity-30 pointer-events-none">
                    {decoration}
                  </div>
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

                {/* Dynamic river seal flash — ice-blue pulse as cell freezes */}
                <AnimatePresence>
                  {isSealing(r, c) && (
                    <motion.div
                      key={`seal-${r}-${c}`}
                      className="absolute inset-0 pointer-events-none z-[7] flex items-center justify-center"
                      initial={{ opacity: 0.9 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      style={{ background: 'rgba(147,197,253,0.82)' }}
                    >
                      <motion.span
                        className="text-sm select-none"
                        initial={{ y: 0, opacity: 1 }}
                        animate={{ y: -18, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        ❄️
                      </motion.span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {level.obstacles.food.some(f => f.row === r && f.col === c)
                    && !isFoodConsumed({ row: r, col: c })
                    && !(level.goal.row === r && level.goal.col === c)
                    && (
                      <motion.span
                        key={`food-${r}-${c}`}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]"
                        initial={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.8, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ fontSize: squareSize * 0.7 }}
                      >
                        {spaceTheme ? '⚡' : '🍎'}
                      </motion.span>
                    )}
                </AnimatePresence>

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
                        goal
                          ? 'w-10 h-10 bg-green-300/50 border-green-400'
                          : spaceTheme
                          ? isMobile ? 'w-7 h-7 bg-cyan-300/70 border-cyan-300' : 'w-5 h-5 bg-cyan-300/60 border-cyan-400/80'
                          : isMobile
                          ? 'w-7 h-7 bg-yellow-300/70 border-yellow-300'
                          : 'w-5 h-5 bg-yellow-300/60 border-yellow-400/80'
                      }`}
                      animate={{
                        boxShadow: goal
                          ? [
                              '0 0 10px rgba(74,222,128,0.4)',
                              '0 0 20px rgba(74,222,128,0.7)',
                              '0 0 10px rgba(74,222,128,0.4)',
                            ]
                          : spaceTheme
                          ? [
                              '0 0 6px rgba(34,211,238,0.3)',
                              '0 0 14px rgba(34,211,238,0.6)',
                              '0 0 6px rgba(34,211,238,0.3)',
                            ]
                          : [
                              '0 0 6px rgba(250,204,21,0.3)',
                              '0 0 14px rgba(250,204,21,0.6)',
                              '0 0 6px rgba(250,204,21,0.3)',
                            ],
                        scale: suggested ? [1, 1.35, 1] : [1, 1.12, 1],
                      }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  </motion.div>
                )}

                {/* ── Sentinel threat zones ── */}
                {(patrolPieces ?? []).map((patrol, si) => {
                  const stepIdx = sentinelSteps[si] ?? (patrol.startIndex ?? 0);
                  const threatened = getSentinelThreat(patrol, stepIdx, numRows, numCols);
                  if (!threatened.some(sq => sq.row === r && sq.col === c)) return null;
                  return (
                    <motion.div
                      key={`threat-${si}`}
                      animate={{ opacity: [0.55, 0.95, 0.55] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 2,
                        background: 'radial-gradient(circle, rgba(251,146,60,0.22) 0%, transparent 75%)',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ position: 'absolute', bottom: 2, right: 2, fontSize: 7, opacity: 0.7 }}>🔴</span>
                    </motion.div>
                  );
                })}

                {/* ── Sweep preview (brighter — threat incoming next step) ── */}
                {sweepPreview.some(sq => sq.row === r && sq.col === c) && (
                  <motion.div
                    key={`sweep-${r}-${c}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(251,146,60,0.52)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* ── Near-miss shimmer ── */}
                {nearMiss?.row === r && nearMiss?.col === c && (
                  <motion.div
                    key={`nearmiss-${r}-${c}`}
                    initial={{ opacity: 0.75 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.65 }}
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(251,146,60,0.75)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* ── King escape squares — amber circles (showKingEscapes only) ── */}
                {kingEscapeSquares.some(sq => sq.row === r && sq.col === c) && (
                  <motion.div
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{
                      width: squareSize * 0.45,
                      height: squareSize * 0.45,
                      borderRadius: '50%',
                      border: '2px solid rgba(251,146,60,0.75)',
                      background: 'rgba(251,146,60,0.18)',
                    }} />
                  </motion.div>
                )}

                {/* ── Route waypoints — amber dots at each patrol stop ── */}
                {(patrolPieces ?? []).map((patrol, si) => {
                  if (!patrol.route.some(wp => wp.row === r && wp.col === c)) return null;
                  // Hide waypoint when sentinel is standing here (don't draw dot under piece)
                  const stepIdx = sentinelSteps[si] ?? (patrol.startIndex ?? 0);
                  const sentinelHere = patrol.route[stepIdx % patrol.route.length];
                  if (patrol.route.length > 1 && sentinelHere.row === r && sentinelHere.col === c) return null;
                  return (
                    <div
                      key={`wp-${si}`}
                      style={{
                        position: 'absolute',
                        width: 6, height: 6,
                        borderRadius: '50%',
                        background: 'rgba(251,146,60,0.38)',
                        border: '0.5px solid rgba(251,146,60,0.55)',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                      }}
                    />
                  );
                })}

                {hasFence(r, c, 'top') && (
                  <div className="absolute top-0 left-0 right-0 z-[5] flex items-center" style={{ height: '6px' }}>
                    <div className="w-full h-full rounded-full" style={spaceTheme ? { background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.7)' } : { background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'bottom') && (
                  <div className="absolute bottom-0 left-0 right-0 z-[5] flex items-center" style={{ height: '6px' }}>
                    <div className="w-full h-full rounded-full" style={spaceTheme ? { background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.7)' } : { background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'left') && (
                  <div className="absolute top-0 left-0 bottom-0 z-[5] flex items-center" style={{ width: '6px' }}>
                    <div className="h-full w-full rounded-full" style={spaceTheme ? { background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.7)' } : { background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
                {hasFence(r, c, 'right') && (
                  <div className="absolute top-0 right-0 bottom-0 z-[5] flex items-center" style={{ width: '6px' }}>
                    <div className="h-full w-full rounded-full" style={spaceTheme ? { background: '#22d3ee', boxShadow: '0 0 8px rgba(34,211,238,0.7)' } : { background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '-2px 0 4px rgba(0,0,0,0.3)' }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Enemy pieces — shadow copies; exit-animate when captured */}
        <AnimatePresence>
          {liveEnemies.map(enemy => (
            <motion.div
              key={`enemy-${enemy.row}-${enemy.col}`}
              className="absolute pointer-events-none flex items-center justify-center z-[8]"
              style={{
                width: `${squareSize}px`,
                height: `${squareSize}px`,
                left: enemy.col * squareSize,
                top: enemy.row * squareSize,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.72 }}
              exit={{ scale: 1.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <motion.div
                animate={{ filter: ['drop-shadow(0 0 6px rgba(139,92,246,0.6))', 'drop-shadow(0 0 14px rgba(139,92,246,0.9))', 'drop-shadow(0 0 6px rgba(139,92,246,0.6))'] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ filter: 'grayscale(0.6) brightness(0.55) saturate(0.5)' }}
              >
                <ChessPieceIcon type={enemy.pieceType} size={squareSize * 0.7} />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Ghost replay piece — translucent, advances on a timer set by the parent */}
        {ghostPos && (
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              width: `${squareSize}px`,
              height: `${squareSize}px`,
              left: ghostPos.col * squareSize,
              top: ghostPos.row * squareSize,
              zIndex: 9,
              opacity: 0.38,
              transition: 'left 0.35s ease, top 0.35s ease',
            }}
          >
            <ChessPieceIcon type={level.pieceType} size={squareSize * 0.7} />
          </div>
        )}

        {/* ── Guard pieces — static enemy pieces with red tint ── */}
        {(level.guardPieces ?? []).map((g, gi) => (
          <div
            key={`guard-${gi}`}
            style={{
              position: 'absolute',
              top: g.position.row * squareSize,
              left: g.position.col * squareSize,
              width: squareSize,
              height: squareSize,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 8,
            }}
          >
            <div style={{ filter: 'hue-rotate(340deg) saturate(1.8) brightness(0.75)', opacity: 0.9 }}>
              <ChessPieceIcon type={g.pieceType} size={squareSize * 0.78} />
            </div>
          </div>
        ))}

        {/* ── Sentinel pieces ── */}
        {(patrolPieces ?? []).map((patrol, si) => {
          const stepIdx = sentinelSteps[si] ?? (patrol.startIndex ?? 0);
          const pos = patrol.route[stepIdx % patrol.route.length];
          return (
            <div
              key={`sentinel-${si}`}
              style={{
                position: 'absolute',
                top: pos.row * squareSize,
                left: pos.col * squareSize,
                width: squareSize,
                height: squareSize,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 12,
              }}
            >
              {/* Glow ring */}
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%',
                boxShadow: '0 0 10px 2px rgba(239,68,68,0.65)',
                pointerEvents: 'none',
              }} />
              <motion.div
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ filter: 'hue-rotate(300deg) saturate(2.2) brightness(0.85)' }}
              >
                <ChessPieceIcon type={patrol.pieceType} size={squareSize * 0.82} />
              </motion.div>
            </div>
          );
        })}

        {/* ── Enemy king (trapMode) ── */}
        {kingPos && (
          <motion.div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              width: `${squareSize}px`,
              height: `${squareSize}px`,
              left: kingPos.col * squareSize,
              top: kingPos.row * squareSize,
              zIndex: 11,
            }}
            animate={kingCollapsing
              ? { scale: [1, 0.3], opacity: [1, 0], rotate: [0, 20] }
              : { scale: 1, opacity: 1 }
            }
            transition={kingCollapsing
              ? { duration: 0.6, ease: 'easeIn' }
              : { type: 'spring', stiffness: 260, damping: 20 }
            }
          >
            {/* Pulsing dark glow ring */}
            <motion.div
              style={{
                position: 'absolute', inset: -3, borderRadius: '50%',
                boxShadow: '0 0 12px 3px rgba(17,24,39,0.7)',
                pointerEvents: 'none',
              }}
              animate={kingCollapsing ? {} : { opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              animate={kingCollapsing ? {} : { scale: [1, 1.06, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ filter: 'grayscale(1) brightness(0.3) saturate(0)' }}
            >
              <ChessPieceIcon type="king" size={squareSize * 0.8} />
            </motion.div>
          </motion.div>
        )}

        {/* ── Full-screen caught flash overlay ── */}
        {caughtBy !== null && (
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(185,28,28,0.50)',
              pointerEvents: 'none',
              zIndex: 50,
            }}
          />
        )}

        {/* ── Catch sequence card ── */}
        <AnimatePresence>
          {catchActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 30,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
                borderRadius: 4,
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                style={{
                  background: 'rgba(30,10,10,0.9)',
                  border: '1px solid rgba(239,68,68,0.5)',
                  borderRadius: 12, padding: '20px 28px',
                  textAlign: 'center', color: 'white',
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔴</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  The sentinel found you.
                </div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  onClick={handleCatchReset}
                  style={{
                    background: 'rgba(239,68,68,0.2)',
                    border: '1px solid rgba(239,68,68,0.5)',
                    borderRadius: 8, color: 'white',
                    padding: '8px 20px', cursor: 'pointer', fontSize: 15,
                  }}
                >
                  ↺ Try again
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating animated piece */}
        <motion.div
          className="absolute z-10 pointer-events-none"
          style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
          animate={{ left: displayPos.col * squareSize, top: displayPos.row * squareSize }}
          transition={
            (displayPieceType ?? level.pieceType) === 'knight'
              ? { type: 'spring', stiffness: 160, damping: 16 }
              : { type: 'spring', stiffness: 280, damping: 26 }
          }
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            key={animKey}
            animate={(displayPieceType ?? level.pieceType) === 'knight' ? { y: [0, -22, 0], rotate: [0, -5, 5, 0] } : { y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <motion.div
              animate={{
                filter: cleanEscape
                  ? 'drop-shadow(0 0 8px rgba(34,211,238,0.9))'
                  : [
                      'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
                      'drop-shadow(0 6px 10px rgba(0,0,0,0.35))',
                      'drop-shadow(0 4px 6px rgba(0,0,0,0.25))',
                    ],
              }}
              transition={{ duration: cleanEscape ? 0.1 : 2, repeat: cleanEscape ? 0 : Infinity }}
            >
              <ChessPieceIcon type={displayPieceType ?? level.pieceType} size={squareSize * 0.7} />
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Mobile coach tip — rendered directly below the board */}
      <AnimatePresence>
        {mobileCoach && isMobile && (
          <motion.div
            className="mt-3 bg-sky-50 border-2 border-sky-200 rounded-xl py-2.5 px-4 max-w-sm text-sm text-sky-800 shadow-md"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
          >
            🤖 {mobileCoach}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

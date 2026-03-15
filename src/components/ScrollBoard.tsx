/**
 * ScrollBoard — a 5-wide × N-deep (or N-wide × 5-deep) board that pans to
 * follow the piece, giving the feeling of exploring a real world rather than
 * playing on a fixed postcard.
 *
 * The viewport is always 5 squares along the fixed axis. Along the scroll
 * axis it shows 5 squares plus a thin "peek" fringe at each end, masked to
 * a gentle fade. As the piece approaches the frontier edge, the viewport
 * springs forward to open up the world ahead.
 *
 * Scroll trigger (user spec):
 *   When the piece is ON or 1 square from the frontier edge, the viewport
 *   scrolls so the piece is snapped to the center (TARGET=2) of the 5-square
 *   viewport — "opening up" the world in front of them.
 *
 * Props: identical to BoardShellProps. Extra board metadata is read from
 *   level.boardHeight / level.boardWidth / level.scrollAxis.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Flag } from 'lucide-react';
import { Level, Position, Food } from '../types';
import { getValidMoves, isValidMove } from '../utils/moveCalculator';
import { playCrunchSound, playWompSound, playMoveSound, playWhooshSound } from '../utils/sounds';
import { ChessPieceIcon } from './ChessPieceIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBLE = 5;
/** Fraction of a square peeking through the fade at each edge. */
const PEEK = 0.15;

// ─── Viewport anchor logic ────────────────────────────────────────────────────

/**
 * After a piece move, compute the new viewport anchor (the world index at the
 * scroll-axis start of the visible window).
 *
 * frontier = 'low'  → piece moves toward lower indices (vertical, going up)
 * frontier = 'high' → piece moves toward higher indices (horizontal, going right)
 */
function computeAnchor(
  pieceAxis: number,
  currentAnchor: number,
  boardSize: number,
  frontier: 'low' | 'high',
): number {
  const TRIGGER = 1; // trigger when piece is this many squares from the frontier
  const TARGET  = 2; // after scroll, piece lands at center of the visible window

  let anchor = currentAnchor;

  if (frontier === 'low') {
    // Frontier = top/left (low index). Piece moves upward / leftward.
    if (pieceAxis <= anchor + TRIGGER) {
      // Near frontier — open the world ahead
      anchor = pieceAxis - TARGET;
    } else if (pieceAxis >= anchor + VISIBLE - 1) {
      // Near trailing edge — keep piece visible
      anchor = pieceAxis - (VISIBLE - 1);
    }
  } else {
    // Frontier = bottom/right (high index). Piece moves downward / rightward.
    if (pieceAxis >= anchor + VISIBLE - 1 - TRIGGER) {
      // Near frontier — open the world ahead
      anchor = pieceAxis - (VISIBLE - 1 - TARGET);
    } else if (pieceAxis <= anchor) {
      // Near trailing edge — keep piece visible
      anchor = pieceAxis;
    }
  }

  return Math.max(0, Math.min(anchor, boardSize - VISIBLE));
}

// ─── Decoration helper (same hash as BoardShell) ─────────────────────────────

function getDecoration(r: number, c: number): string | null {
  const hash = Math.abs((r * 31) ^ (c * 37)) % 10;
  if (hash === 1) return '🌱';
  if (hash === 2) return '🌼';
  if (hash === 3) return '🍀';
  if (hash === 4) return '🌿';
  return null;
}

// ─── Parallax background decorations ─────────────────────────────────────────

const PARALLAX_EMOJIS = ['🌲', '🌳', '🏔️', '⛰️', '🌲', '🌳'];

function buildParallaxDecos(rows: number, cols: number, sqSize: number) {
  const decos: Array<{ emoji: string; x: number; y: number; fontSize: number; opacity: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Sparse: ~1 deco per 5 cells
      const h = Math.abs((r * 53) ^ (c * 79)) % 5;
      if (h !== 0) continue;
      const ei    = Math.abs((r * 17) ^ (c * 31)) % PARALLAX_EMOJIS.length;
      const sz    = sqSize * (0.55 + (Math.abs((r * 11) ^ (c * 23)) % 20) / 100);
      const alpha = 0.18 + (Math.abs((r * 7)  ^ (c * 13)) % 12) / 100;
      decos.push({
        emoji:    PARALLAX_EMOJIS[ei],
        x:        c * sqSize + sqSize * 0.05,
        y:        r * sqSize - sqSize * 0.15,
        fontSize: sz,
        opacity:  alpha,
      });
    }
  }
  return decos;
}

// ─── Props (mirror of BoardShellProps) ───────────────────────────────────────

export interface ScrollBoardProps {
  level: Level;
  consumedFood: Position[];
  trail: Position[];
  squareSize: number;
  isMobile: boolean;
  onMove: (newPos: Position) => void;
  onFoodConsumed: (food: Food) => void;
  onStuck: (stuck: boolean) => void;
  worldTheme?: React.CSSProperties;
  /** When true, adds a subtle violet tint to light squares (bishop world checkerboard) */
  showCheckerboard?: boolean;
  /** Ghost replay position — translucent copy of the piece at this cell (null = hidden) */
  ghostPos?: Position | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ScrollBoard({
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
}: ScrollBoardProps) {
  const axis      = level.scrollAxis ?? 'vertical';
  const boardRows = level.boardHeight ?? VISIBLE;
  const boardCols = level.boardWidth  ?? VISIBLE;
  const frontier  = axis === 'vertical' ? 'low' : 'high';

  // ── Piece state ──────────────────────────────────────────────────────────
  const [piecePos, setPiecePos]       = useState<Position>(level.start);
  const [validMoves, setValidMoves]   = useState<Position[]>([]);
  const [animKey, setAnimKey]         = useState(0);
  const [suggestedMove, setSuggestedMove] = useState<Position | null>(null);
  const [mobileCoach, setMobileCoach] = useState<string | null>(null);

  // ── Peek pan state ────────────────────────────────────────────────────────
  // peekOffset: extra px shift added to gridOffset while the user drags
  const [peekOffset,  setPeekOffset]  = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const isDragging  = useRef(false);
  const hasDragged  = useRef(false);
  const dragStartRef = useRef({ pointer: 0, peek: 0 });

  // ── Viewport ─────────────────────────────────────────────────────────────
  const boardSize    = axis === 'vertical' ? boardRows : boardCols;
  const pieceAxis    = axis === 'vertical' ? level.start.row : level.start.col;
  const initialAnchor = Math.max(0, Math.min(
    axis === 'vertical'
      ? pieceAxis - (VISIBLE - 1)   // start row near the bottom of the viewport
      : pieceAxis,                   // start col at the left of the viewport
    boardSize - VISIBLE,
  ));

  const [viewportAnchor, setViewportAnchor] = useState(initialAnchor);

  // ── Spring animation of grid offset ──────────────────────────────────────
  // gridOffset = how many px to shift the grid so viewportAnchor row/col
  // appears at (PEEK * squareSize) from the container edge.
  const gridOffset = useMotionValue(PEEK * squareSize - initialAnchor * squareSize);
  const springGridOffset = useSpring(gridOffset, { stiffness: 180, damping: 28, restDelta: 0.5 });

  // Background layer moves at 40% the speed of the grid — creates depth parallax
  const parallaxOffset = useTransform(springGridOffset, (v) => v * 0.4);
  const parallaxDecos  = useMemo(
    () => buildParallaxDecos(boardRows, boardCols, squareSize),
    [boardRows, boardCols, squareSize],
  );

  useEffect(() => {
    gridOffset.set(PEEK * squareSize - viewportAnchor * squareSize + peekOffset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportAnchor, squareSize, peekOffset]);

  // ── Valid moves ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Watched squares (queen world) are treated as impassable — merge them into
    // obstacles.rivers so the existing move calculator blocks them.
    const effectiveObstacles = level.watchedSquares?.length
      ? { ...level.obstacles, rivers: [...level.obstacles.rivers, ...level.watchedSquares] }
      : level.obstacles;
    const moves = getValidMoves(
      level.pieceType, piecePos, effectiveObstacles, consumedFood,
      boardRows, boardCols,
    );
    setValidMoves(moves);

    const atGoal = piecePos.row === level.goal.row && piecePos.col === level.goal.col;
    if (moves.length === 0 && animKey > 0 && !atGoal) {
      onStuck(true);
      playWompSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 60, 120]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecePos, consumedFood]);

  // ── Viewport shift after each move ───────────────────────────────────────
  useEffect(() => {
    const pa = axis === 'vertical' ? piecePos.row : piecePos.col;
    const newAnchor = computeAnchor(pa, viewportAnchor, boardSize, frontier);
    if (newAnchor !== viewportAnchor) {
      setViewportAnchor(newAnchor);
      if (!hasScrolled) {
        setHasScrolled(true);
        playWhooshSound();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piecePos]);

  // ── Click handler ─────────────────────────────────────────────────────────
  const handleSquareClick = (row: number, col: number) => {
    if (!isValidMove(validMoves, row, col)) {
      if (isMobile && validMoves.length > 0) {
        const nearest = validMoves.reduce((best, candidate) => {
          const bd = Math.abs(best.row - row) + Math.abs(best.col - col);
          const cd = Math.abs(candidate.row - row) + Math.abs(candidate.col - col);
          return cd < bd ? candidate : best;
        }, validMoves[0]);
        setSuggestedMove(nearest);
        setMobileCoach('Try one of the glowing circles ✨');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(24);
      }
      return;
    }

    // Valid move — spring the viewport back to auto-follow
    if (peekOffset !== 0) setPeekOffset(0);
    isDragging.current = false;
    hasDragged.current = false;

    const newPos = { row, col };
    setSuggestedMove(null);
    setMobileCoach(null);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10);
    setPiecePos(newPos);
    setAnimKey(prev => prev + 1);
    onStuck(false);

    const eatenFood = level.obstacles.food.find(f => f.row === row && f.col === col);
    if (eatenFood) {
      onFoodConsumed(eatenFood);
      playCrunchSound();
    } else {
      playMoveSound(level.pieceType);
    }

    onMove(newPos);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────
  const isRiverCell  = (r: number, c: number) => level.obstacles.rivers.some(rv => rv.row === r && rv.col === c);
  const isBridgeCell = (r: number, c: number) => level.obstacles.bridges.some(b => b.row === r && b.col === c);
  const isGoalCell   = (r: number, c: number) => level.goal.row === r && level.goal.col === c;
  const isTrailCell  = (r: number, c: number) => trail.some(t => t.row === r && t.col === c);
  const hasFence     = (r: number, c: number, side: string) =>
    level.obstacles.fences.some(f => f.row === r && f.col === c && f.side === side);
  const isValidCell  = (r: number, c: number) => validMoves.some(m => m.row === r && m.col === c);
  const isPieceCell  = (r: number, c: number) => piecePos.row === r && piecePos.col === c;
  const isFoodConsumed = (pos: Position) =>
    consumedFood.some(f => f.row === pos.row && f.col === pos.col);

  const getSquareClasses = (r: number, c: number) => {
    if (isRiverCell(r, c) && !isBridgeCell(r, c)) return 'bg-blue-400';
    if (isRiverCell(r, c) && isBridgeCell(r, c)) return 'bg-amber-500';
    return (r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400';
  };

  // ── Peek pan handlers ─────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStartRef.current = {
      pointer: axis === 'vertical' ? e.clientY : e.clientX,
      peek: peekOffset,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const current = axis === 'vertical' ? e.clientY : e.clientX;
    const rawDelta = current - dragStartRef.current.pointer;

    if (!hasDragged.current) {
      if (Math.abs(rawDelta) < 6) return; // below drag threshold
      hasDragged.current = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }

    // For vertical (piece goes up / frontier=low): dragging UP (neg delta) peeks toward top
    // For horizontal (piece goes right / frontier=high): dragging LEFT (neg delta) peeks toward right
    const rawPeekDelta = axis === 'vertical' ? -rawDelta : rawDelta;
    const newPeek = dragStartRef.current.peek + rawPeekDelta;

    // Clamp so the total grid offset stays within world boundaries
    const baseOffset = PEEK * squareSize - viewportAnchor * squareSize;
    const totalMax = PEEK * squareSize;
    const totalMin = PEEK * squareSize - (boardSize - VISIBLE) * squareSize;
    const clampedTotal = Math.max(totalMin, Math.min(totalMax, baseOffset + newPeek));
    setPeekOffset(clampedTotal - baseOffset);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    hasDragged.current = false;
  };

  // ── Dimensions ────────────────────────────────────────────────────────────
  // Container: 5 squares on the fixed axis, (5 + 2*PEEK) on the scroll axis
  const fixedPx    = VISIBLE * squareSize;
  const scrollPx   = (VISIBLE + 2 * PEEK) * squareSize;
  const containerW = axis === 'vertical' ? fixedPx : scrollPx;
  const containerH = axis === 'vertical' ? scrollPx : fixedPx;

  const gridW = boardCols * squareSize;
  const gridH = boardRows * squareSize;

  // CSS mask fades the peek fringe on both edges of the scroll axis
  const fadeStop1 = `${(PEEK / (VISIBLE + 2 * PEEK)) * 100}%`;
  const fadeStop2 = `${((VISIBLE + PEEK) / (VISIBLE + 2 * PEEK)) * 100}%`;
  const maskDir   = axis === 'vertical' ? 'to bottom' : 'to right';
  const maskImage = `linear-gradient(${maskDir}, transparent 0%, black ${fadeStop1}, black ${fadeStop2}, transparent 100%)`;

  // ── Render ────────────────────────────────────────────────────────────────
  const totalCells = boardRows * boardCols;

  return (
    <>
      {/* Wrapper provides positioning context for the "more ahead" arrow */}
      <div style={{ position: 'relative', width: `${containerW}px`, height: `${containerH}px` }}>

      {/* Outer shell: same border styling as BoardShell */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{
          width:  `${containerW}px`,
          height: `${containerH}px`,
          position: 'relative',
          maskImage,
          WebkitMaskImage: maskImage,
          touchAction: 'none',
          cursor: hasDragged.current ? 'grabbing' : 'grab',
          ...worldTheme,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Parallax background — drifts at 40% speed to create depth */}
        <motion.div
          aria-hidden="true"
          style={{
            width:    `${gridW}px`,
            height:   `${gridH}px`,
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 0,
            ...(axis === 'vertical'   ? { y: parallaxOffset } : {}),
            ...(axis === 'horizontal' ? { x: parallaxOffset } : {}),
          }}
        >
          {parallaxDecos.map((d, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                left: d.x,
                top:  d.y,
                fontSize: d.fontSize,
                opacity:  d.opacity,
                lineHeight: 1,
                userSelect: 'none',
              }}
            >
              {d.emoji}
            </span>
          ))}
        </motion.div>

        {/* Scrolling grid — moves along the scroll axis */}
        <motion.div
          style={{
            width:    `${gridW}px`,
            height:   `${gridH}px`,
            position: 'absolute',
            top: 0,
            left: 0,
            ...(axis === 'vertical'   ? { y: springGridOffset } : {}),
            ...(axis === 'horizontal' ? { x: springGridOffset } : {}),
          }}
        >
          {/* Cell grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${boardCols}, ${squareSize}px)`,
              gridTemplateRows:    `repeat(${boardRows}, ${squareSize}px)`,
              width:  `${gridW}px`,
              height: `${gridH}px`,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {Array.from({ length: totalCells }, (_, i) => {
              const r = Math.floor(i / boardCols);
              const c = i % boardCols;

              const river      = isRiverCell(r, c);
              const bridge     = isBridgeCell(r, c);
              const goal       = isGoalCell(r, c);
              const valid      = isValidCell(r, c);
              const suggested  = suggestedMove?.row === r && suggestedMove?.col === c;
              const piece      = isPieceCell(r, c);
              const inTrail    = isTrailCell(r, c) && !piece;
              const decoration = !river && !bridge && !goal && !piece ? getDecoration(r, c) : null;

              return (
                <motion.div
                  key={`${r}-${c}`}
                  className={`relative ${getSquareClasses(r, c)} ${valid ? 'cursor-pointer' : ''}`}
                  style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
                  onClick={() => handleSquareClick(r, c)}
                  whileHover={valid ? { scale: 1.03 } : {}}
                >
                  {!river && !bridge && (
                    <div className={`absolute inset-0 ${(r + c) % 2 === 0 ? 'grass-light' : 'grass-dark'}`} />
                  )}

                  {!river && !bridge && showCheckerboard && (r + c) % 2 === 0 && (
                    <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(139,92,246,0.13)' }} />
                  )}

                  {!river && !bridge && level.watchedSquares?.some(ws => ws.row === r && ws.col === c) && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      style={{ background: 'rgba(239,68,68,0.22)' }}>
                      <span className="text-xs opacity-40 select-none">👁</span>
                    </div>
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

                  <AnimatePresence>
                    {level.obstacles.food.some(f => f.row === r && f.col === c)
                      && !isFoodConsumed({ row: r, col: c })
                      && !goal
                      && (
                        <motion.span
                          key={`food-${r}-${c}`}
                          className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]"
                          initial={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ fontSize: squareSize * 0.7 }}
                        >
                          🍎
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
                            : isMobile
                            ? 'w-7 h-7 bg-yellow-300/70 border-yellow-300'
                            : 'w-5 h-5 bg-yellow-300/60 border-yellow-400/80'
                        }`}
                        animate={{
                          boxShadow: goal
                            ? ['0 0 10px rgba(74,222,128,0.4)', '0 0 20px rgba(74,222,128,0.7)', '0 0 10px rgba(74,222,128,0.4)']
                            : ['0 0 6px rgba(250,204,21,0.3)', '0 0 14px rgba(250,204,21,0.6)', '0 0 6px rgba(250,204,21,0.3)'],
                          scale: suggested ? [1, 1.35, 1] : [1, 1.12, 1],
                        }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    </motion.div>
                  )}

                  {hasFence(r, c, 'top') && (
                    <div className="absolute top-0 left-0 right-0 z-[5]" style={{ height: '6px' }}>
                      <div className="w-full h-full rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  )}
                  {hasFence(r, c, 'bottom') && (
                    <div className="absolute bottom-0 left-0 right-0 z-[5]" style={{ height: '6px' }}>
                      <div className="w-full h-full rounded-full" style={{ background: 'repeating-linear-gradient(90deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  )}
                  {hasFence(r, c, 'left') && (
                    <div className="absolute top-0 left-0 bottom-0 z-[5]" style={{ width: '6px' }}>
                      <div className="h-full w-full rounded-full" style={{ background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  )}
                  {hasFence(r, c, 'right') && (
                    <div className="absolute top-0 right-0 bottom-0 z-[5]" style={{ width: '6px' }}>
                      <div className="h-full w-full rounded-full" style={{ background: 'repeating-linear-gradient(0deg, #78350f 0px, #78350f 5px, #92400e 5px, #92400e 7px, #a16207 7px, #a16207 9px)', boxShadow: '-2px 0 4px rgba(0,0,0,0.3)' }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

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

          {/* Floating piece — positioned in world coords, scrolls with the grid */}
          <motion.div
            className="absolute z-10 pointer-events-none"
            style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
            animate={{ left: piecePos.col * squareSize, top: piecePos.row * squareSize }}
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
                <ChessPieceIcon type={level.pieceType} size={squareSize * 0.7} />
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* "More ahead" arrow — pulsing hint at the frontier edge before first scroll */}
      {!hasScrolled && (
        <motion.div
          className="absolute pointer-events-none z-20 flex items-center justify-center"
          style={
            axis === 'vertical'
              ? { top: 6, left: 0, right: 0 }
              : { right: 6, top: 0, bottom: 0 }
          }
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 5px rgba(0,0,0,0.7)', lineHeight: 1 }}>
            {axis === 'vertical' ? '↑' : '→'}
          </span>
        </motion.div>
      )}

      </div>{/* end wrapper */}

      {/* Mobile coach tip */}
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

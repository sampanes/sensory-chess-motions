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

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Flag } from 'lucide-react';
import { Level, Position, Food } from '../types';
import { getValidMoves, isValidMove } from '../utils/moveCalculator';
import { playCrunchSound, playWompSound, playMoveSound } from '../utils/sounds';
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

  useEffect(() => {
    gridOffset.set(PEEK * squareSize - viewportAnchor * squareSize);
  }, [viewportAnchor, squareSize]);

  // ── Valid moves ──────────────────────────────────────────────────────────
  useEffect(() => {
    const moves = getValidMoves(
      level.pieceType, piecePos, level.obstacles, consumedFood,
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
    if (newAnchor !== viewportAnchor) setViewportAnchor(newAnchor);
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
      {/* Outer shell: same border styling as BoardShell */}
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{
          width:  `${containerW}px`,
          height: `${containerH}px`,
          position: 'relative',
          maskImage,
          WebkitMaskImage: maskImage,
          ...worldTheme,
        }}
      >
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

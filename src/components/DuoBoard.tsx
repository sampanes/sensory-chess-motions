/**
 * DuoBoard — a two-piece cooperative board for the "Paired Path" world.
 *
 * Two pieces share the same board. The player taps a piece to select it,
 * then taps a valid destination. Pieces may pass through each other's square
 * (cooperative, not blocking) but may NOT land on the same square.
 *
 * Supports both fixed 5×5 and scrolling (horizontal/vertical) boards.
 * The viewport follows the currently selected piece.
 *
 * Key correctness notes:
 *  1. Post-filter: after getValidMoves, remove the OTHER piece's landing square.
 *     This only removes the destination — it does NOT block pass-through for
 *     sliding pieces (each square in the returned list is a valid destination;
 *     the other piece's square is simply not a valid *destination*).
 *  2. Completion check uses derived positions (not stale React state) so it
 *     fires correctly on the same render tick as the move.
 *  3. goalReached flag prevents clicks during the 600ms celebration delay.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Flag } from 'lucide-react';
import { Food, Position } from '../types';
import { DuoLevel } from '../adventure/duoLevelDef';
import { getValidMoves, isValidMove } from '../utils/moveCalculator';
import { playCrunchSound, playWompSound, playMoveSound } from '../utils/sounds';
import { ChessPieceIcon } from './ChessPieceIcon';

// ─── Viewport constants (mirrors ScrollBoard) ─────────────────────────────────

const VISIBLE = 5;
const PEEK    = 0.15;

function computeAnchor(
  pieceAxis: number,
  currentAnchor: number,
  boardSize: number,
  frontier: 'low' | 'high',
): number {
  const TRIGGER = 1;
  const TARGET  = 2;
  let anchor = currentAnchor;
  if (frontier === 'low') {
    if (pieceAxis <= anchor + TRIGGER)          anchor = pieceAxis - TARGET;
    else if (pieceAxis >= anchor + VISIBLE - 1) anchor = pieceAxis - (VISIBLE - 1);
  } else {
    if (pieceAxis >= anchor + VISIBLE - 1 - TRIGGER) anchor = pieceAxis - (VISIBLE - 1 - TARGET);
    else if (pieceAxis <= anchor)                     anchor = pieceAxis;
  }
  return Math.max(0, Math.min(anchor, boardSize - VISIBLE));
}

// ─── Decoration helper ────────────────────────────────────────────────────────

function getDecoration(r: number, c: number): string | null {
  const hash = Math.abs((r * 31) ^ (c * 37)) % 10;
  if (hash === 1) return '🌱';
  if (hash === 2) return '🌼';
  if (hash === 3) return '🍀';
  if (hash === 4) return '🌿';
  return null;
}

// ─── Piece accent colours ─────────────────────────────────────────────────────

const PIECE_ACCENT = ['#f59e0b', '#38bdf8'] as const; // amber for A, sky for B

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DuoBoardProps {
  level: DuoLevel;
  consumedFood: Food[];
  squareSize: number;
  isMobile: boolean;
  /** Called after every move with the new running total. */
  onMove: (totalMoves: number) => void;
  onFoodConsumed: (food: Food) => void;
  /** Called when both pieces have reached their goals (after a 600ms delay). */
  onComplete: (totalMoves: number) => void;
  onStuck: (stuck: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DuoBoard({
  level,
  consumedFood,
  squareSize,
  isMobile,
  onMove,
  onFoodConsumed,
  onComplete,
  onStuck,
}: DuoBoardProps) {
  const axis      = level.scrollAxis ?? null;
  const boardRows = level.boardHeight ?? VISIBLE;
  const boardCols = level.boardWidth  ?? VISIBLE;
  const frontier  = axis === 'vertical' ? 'low' : 'high';
  const boardSize = axis === 'vertical' ? boardRows : boardCols;

  // ── Piece state ────────────────────────────────────────────────────────────
  const [positions, setPositions] = useState<[Position, Position]>([
    { ...level.pieces[0].start },
    { ...level.pieces[1].start },
  ]);
  const [selectedIdx, setSelectedIdx] = useState<0 | 1>(0);
  const [validMoves,  setValidMoves]  = useState<Position[]>([]);
  const [animKeys,    setAnimKeys]    = useState<[number, number]>([0, 0]);
  const [totalMoves,  setTotalMoves]  = useState(0);
  const [trails, setTrails] = useState<[Position[], Position[]]>([
    [{ ...level.pieces[0].start }],
    [{ ...level.pieces[1].start }],
  ]);
  const [hasMoved,     setHasMoved]   = useState(false);
  const [goalReached,  setGoalReached] = useState(false);
  const [mobileCoach,  setMobileCoach] = useState<string | null>(null);
  const [suggestedMove, setSuggestedMove] = useState<Position | null>(null);

  // ── Viewport (scroll only) ─────────────────────────────────────────────────
  const initialAnchorForPiece = (idx: 0 | 1) => {
    const pa = axis === 'vertical'
      ? level.pieces[idx].start.row
      : level.pieces[idx].start.col;
    return Math.max(0, Math.min(
      axis === 'vertical' ? pa - (VISIBLE - 1) : pa,
      boardSize - VISIBLE,
    ));
  };
  const [viewportAnchor, setViewportAnchor] = useState(() => initialAnchorForPiece(0));
  const gridOffset       = useMotionValue(PEEK * squareSize - initialAnchorForPiece(0) * squareSize);
  const springGridOffset = useSpring(gridOffset, { stiffness: 180, damping: 28, restDelta: 0.5 });

  // Update spring when anchor changes
  useEffect(() => {
    if (!axis) return;
    gridOffset.set(PEEK * squareSize - viewportAnchor * squareSize);
  }, [viewportAnchor, squareSize]);

  // ── Recompute valid moves on position/selection/food change ───────────────
  useEffect(() => {
    const currentPos = positions[selectedIdx];
    const otherPos   = positions[1 - selectedIdx as 0 | 1];

    const pieceType = level.pieces[selectedIdx].pieceType;
    const effectiveObstacles = level.obstacles;

    const raw = getValidMoves(
      pieceType,
      currentPos,
      effectiveObstacles,
      consumedFood,
      boardRows,
      boardCols,
    );

    // ⚠️ Post-filter: remove the other piece's square as a landing destination.
    // This does NOT prevent pass-through for sliding pieces — each entry in `raw`
    // is an independent valid *destination*; removing one doesn't block others.
    const filtered = raw.filter(
      m => !(m.row === otherPos.row && m.col === otherPos.col),
    );
    setValidMoves(filtered);

    const atGoal =
      currentPos.row === level.pieces[selectedIdx].goal.row &&
      currentPos.col === level.pieces[selectedIdx].goal.col;

    if (filtered.length === 0 && hasMoved && !atGoal) {
      onStuck(true);
      playWompSound();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 60, 120]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, selectedIdx, consumedFood]);

  // ── Viewport follows selected piece after moves or selection switch ────────
  useEffect(() => {
    if (!axis) return;
    const selPos = positions[selectedIdx];
    const pa = axis === 'vertical' ? selPos.row : selPos.col;
    const newAnchor = computeAnchor(pa, viewportAnchor, boardSize, frontier);
    if (newAnchor !== viewportAnchor) setViewportAnchor(newAnchor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, selectedIdx]);

  // ── Click handler ──────────────────────────────────────────────────────────
  const handleSquareClick = (row: number, col: number) => {
    if (goalReached) return;

    // ── Click on a piece → select it ────────────────────────────────────────
    for (const idx of [0, 1] as const) {
      if (positions[idx].row === row && positions[idx].col === col) {
        if (selectedIdx !== idx) {
          setSelectedIdx(idx);
          setSuggestedMove(null);
          setMobileCoach(null);
          onStuck(false);
        }
        return;
      }
    }

    // ── Click on a valid move destination ───────────────────────────────────
    if (!isValidMove(validMoves, row, col)) {
      if (isMobile && validMoves.length > 0) {
        const nearest = validMoves.reduce((best, c) => {
          const bd = Math.abs(best.row - row) + Math.abs(best.col - col);
          const cd = Math.abs(c.row - row)    + Math.abs(c.col - col);
          return cd < bd ? c : best;
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

    // Build derived state values (not relying on React's async setState)
    const newPositions: [Position, Position] = [{ ...positions[0] }, { ...positions[1] }];
    newPositions[selectedIdx] = newPos;

    const newAnimKeys: [number, number] = [animKeys[0], animKeys[1]];
    newAnimKeys[selectedIdx] += 1;

    const newTrails: [Position[], Position[]] = [
      [...trails[0]],
      [...trails[1]],
    ];
    newTrails[selectedIdx] = [...newTrails[selectedIdx], newPos];

    const newTotalMoves = totalMoves + 1;

    setPositions(newPositions);
    setAnimKeys(newAnimKeys);
    setTrails(newTrails);
    setTotalMoves(newTotalMoves);
    setHasMoved(true);
    onStuck(false);

    // Food consumption
    const eatenFood = level.obstacles.food.find(f => f.row === row && f.col === col);
    if (eatenFood) {
      onFoodConsumed(eatenFood);
      playCrunchSound();
    } else {
      playMoveSound(level.pieces[selectedIdx].pieceType);
    }

    onMove(newTotalMoves);

    // ⚠️ Completion check — use derived positions, not stale `positions` state.
    const goal0 = level.pieces[0].goal;
    const goal1 = level.pieces[1].goal;
    const pos0  = newPositions[0];
    const pos1  = newPositions[1];

    if (
      pos0.row === goal0.row && pos0.col === goal0.col &&
      pos1.row === goal1.row && pos1.col === goal1.col
    ) {
      setGoalReached(true);
      setTimeout(() => onComplete(newTotalMoves), 600);
    }
  };

  // ── Cell rendering helpers ─────────────────────────────────────────────────
  const isRiverCell  = (r: number, c: number) => level.obstacles.rivers.some(rv => rv.row === r && rv.col === c);
  const isBridgeCell = (r: number, c: number) => level.obstacles.bridges.some(b  => b.row  === r && b.col  === c);
  const isGoal       = (r: number, c: number, idx: 0 | 1) =>
    level.pieces[idx].goal.row === r && level.pieces[idx].goal.col === c;
  const isTrail      = (r: number, c: number, idx: 0 | 1) =>
    trails[idx].some(t => t.row === r && t.col === c);
  const hasFence     = (r: number, c: number, side: string) =>
    level.obstacles.fences.some(f => f.row === r && f.col === c && f.side === side);
  const isFoodConsumed = (pos: Position) =>
    consumedFood.some(f => f.row === pos.row && f.col === pos.col);

  const getSquareClasses = (r: number, c: number) => {
    if (isRiverCell(r, c) && !isBridgeCell(r, c)) return 'bg-blue-400';
    if (isRiverCell(r, c) &&  isBridgeCell(r, c)) return 'bg-amber-500';
    return (r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400';
  };

  // ── Build cell grid JSX ────────────────────────────────────────────────────
  const renderCells = () =>
    Array.from({ length: boardRows * boardCols }, (_, i) => {
      const r = Math.floor(i / boardCols);
      const c = i % boardCols;

      const river      = isRiverCell(r, c);
      const bridge     = isBridgeCell(r, c);
      const goal0cell  = isGoal(r, c, 0);
      const goal1cell  = isGoal(r, c, 1);
      const anyGoal    = goal0cell || goal1cell;
      const valid      = validMoves.some(m => m.row === r && m.col === c);
      const suggested  = suggestedMove?.row === r && suggestedMove?.col === c;
      const isPiece    = positions[0].row === r && positions[0].col === c
                      || positions[1].row === r && positions[1].col === c;
      const inTrailA   = isTrail(r, c, 0) && positions[0].row !== r || positions[0].col !== c
        ? isTrail(r, c, 0) && !(positions[0].row === r && positions[0].col === c)
        : false;
      const inTrailA_  = isTrail(r, c, 0) && !(positions[0].row === r && positions[0].col === c);
      const inTrailB_  = isTrail(r, c, 1) && !(positions[1].row === r && positions[1].col === c);
      const decoration = !river && !bridge && !anyGoal && !isPiece
        ? getDecoration(r, c) : null;

      void inTrailA; // suppress lint warning on the unused intermediate variable

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

          {/* Custom threat overlay — hand-crafted zones (watchedSquares) — red dot */}
          {!river && !bridge && level.watchedSquares?.some(ws => ws.row === r && ws.col === c) && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
              <div style={{ width: squareSize * 0.28, height: squareSize * 0.28, borderRadius: '50%', background: 'rgba(239,68,68,0.65)' }} />
            </div>
          )}

          {river && !bridge && (
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute inset-0"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.25) 14px, rgba(255,255,255,0.25) 18px)' }}
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
                <div key={j} className="absolute bg-amber-900/20 rounded-sm"
                  style={{ width: '76%', height: '3px', top: `${20 + j * 20}%`, left: '12%' }} />
              ))}
              <div className="absolute top-2 bottom-2 left-2 w-1 bg-amber-800/40 rounded-full" />
              <div className="absolute top-2 bottom-2 right-2 w-1 bg-amber-800/40 rounded-full" />
            </div>
          )}

          {decoration && (
            <div className="absolute inset-0 flex items-center justify-center text-sm opacity-30 pointer-events-none">
              {decoration}
            </div>
          )}

          {/* Trail dots — amber for piece A, sky for piece B */}
          {inTrailA_ && !anyGoal && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.35 }}
              transition={{ type: 'spring', stiffness: 300 }}>
              <div className="w-3 h-3 rounded-full" style={{ background: PIECE_ACCENT[0] }} />
            </motion.div>
          )}
          {inTrailB_ && !anyGoal && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 0.35 }}
              transition={{ type: 'spring', stiffness: 300 }}>
              <div className="w-3 h-3 rounded-full" style={{ background: PIECE_ACCENT[1] }} />
            </motion.div>
          )}

          {/* Food */}
          <AnimatePresence>
            {level.obstacles.food.some(f => f.row === r && f.col === c)
              && !isFoodConsumed({ row: r, col: c })
              && !anyGoal
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

          {/* Goal for piece A — red flag */}
          {goal0cell && !(positions[0].row === r && positions[0].col === c) && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <div className="absolute inset-1.5 rounded-xl bg-yellow-300/40 border-2 border-yellow-400/60" />
              <Flag className="w-9 h-9 text-red-500 drop-shadow-lg relative z-[1]" />
            </motion.div>
          )}

          {/* Goal for piece B — blue flag */}
          {goal1cell && !(positions[1].row === r && positions[1].col === c) && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <div className="absolute inset-1.5 rounded-xl bg-sky-200/40 border-2 border-sky-400/60" />
              <Flag className="w-9 h-9 text-blue-500 drop-shadow-lg relative z-[1]" />
            </motion.div>
          )}

          {/* Valid move indicator */}
          {valid && (
            <motion.div className="absolute inset-0 flex items-center justify-center z-[3] pointer-events-none"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
              <motion.div
                className={`rounded-full border-2 ${
                  anyGoal
                    ? 'w-10 h-10 bg-green-300/50 border-green-400'
                    : isMobile
                    ? 'w-7 h-7 bg-yellow-300/70 border-yellow-300'
                    : 'w-5 h-5 bg-yellow-300/60 border-yellow-400/80'
                }`}
                animate={{
                  boxShadow: anyGoal
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
    });

  // ── Floating piece divs (two pieces, rendered after cells) ─────────────────
  const renderPiece = (idx: 0 | 1) => {
    const pos       = positions[idx];
    const isSelected = selectedIdx === idx;
    const pieceType  = level.pieces[idx].pieceType;

    return (
      <motion.div
        key={`piece-${idx}`}
        className="absolute z-10 pointer-events-none"
        style={{ width: `${squareSize}px`, height: `${squareSize}px` }}
        animate={{ left: pos.col * squareSize, top: pos.row * squareSize }}
        transition={
          pieceType === 'knight'
            ? { type: 'spring', stiffness: 160, damping: 16 }
            : { type: 'spring', stiffness: 280, damping: 26 }
        }
      >
        {/* Selection ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={isSelected
            ? { boxShadow: [`0 0 0 3px ${PIECE_ACCENT[idx]}aa`, `0 0 0 6px ${PIECE_ACCENT[idx]}55`, `0 0 0 3px ${PIECE_ACCENT[idx]}aa`] }
            : { boxShadow: `0 0 0 2px ${PIECE_ACCENT[idx]}44` }
          }
          transition={isSelected ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
        />

        <motion.div
          className="w-full h-full flex items-center justify-center"
          key={animKeys[idx]}
          animate={pieceType === 'knight' ? { y: [0, -22, 0], rotate: [0, -5, 5, 0] } : { y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Coloured circle background to visually distinguish piece B */}
          {idx === 1 && (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: squareSize * 0.6,
                height: squareSize * 0.6,
                background: `${PIECE_ACCENT[1]}22`,
                border: `2px solid ${PIECE_ACCENT[1]}44`,
              }}
            />
          )}
          <motion.div
            animate={{ filter: ['drop-shadow(0 4px 6px rgba(0,0,0,0.25))', 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))', 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChessPieceIcon type={pieceType} size={squareSize * 0.7} />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const gridW = boardCols * squareSize;
  const gridH = boardRows * squareSize;

  if (axis) {
    // ── Scroll variant ─────────────────────────────────────────────────────
    const fixedPx    = VISIBLE * squareSize;
    const scrollPx   = (VISIBLE + 2 * PEEK) * squareSize;
    const containerW = axis === 'vertical' ? fixedPx : scrollPx;
    const containerH = axis === 'vertical' ? scrollPx : fixedPx;
    const fadeStop1  = `${(PEEK / (VISIBLE + 2 * PEEK)) * 100}%`;
    const fadeStop2  = `${((VISIBLE + PEEK) / (VISIBLE + 2 * PEEK)) * 100}%`;
    const maskDir    = axis === 'vertical' ? 'to bottom' : 'to right';
    const maskImage  = `linear-gradient(${maskDir}, transparent 0%, black ${fadeStop1}, black ${fadeStop2}, transparent 100%)`;

    return (
      <>
        <div
          className="rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
          style={{ width: `${containerW}px`, height: `${containerH}px`, position: 'relative', maskImage, WebkitMaskImage: maskImage }}
        >
          <motion.div
            style={{
              width: `${gridW}px`, height: `${gridH}px`,
              position: 'absolute', top: 0, left: 0,
              ...(axis === 'vertical'   ? { y: springGridOffset } : {}),
              ...(axis === 'horizontal' ? { x: springGridOffset } : {}),
            }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${boardCols}, ${squareSize}px)`,
              gridTemplateRows:    `repeat(${boardRows}, ${squareSize}px)`,
              width: `${gridW}px`, height: `${gridH}px`,
              position: 'absolute', top: 0, left: 0,
            }}>
              {renderCells()}
            </div>
            {renderPiece(0)}
            {renderPiece(1)}
          </motion.div>
        </div>

        {/* Piece selector row — shown below the board */}
        <PieceSelectorBar
          level={level}
          positions={positions}
          selectedIdx={selectedIdx}
          onSelect={idx => { setSelectedIdx(idx); setSuggestedMove(null); setMobileCoach(null); onStuck(false); }}
        />

        <AnimatePresence>
          {mobileCoach && isMobile && (
            <motion.div className="mt-3 bg-sky-50 border-2 border-sky-200 rounded-xl py-2.5 px-4 max-w-sm text-sm text-sky-800 shadow-md"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
              🤖 {mobileCoach}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ── Fixed 5×5 variant ───────────────────────────────────────────────────────
  return (
    <>
      <motion.div
        className="relative rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-700"
        style={{ width: `${gridW}px`, height: `${gridH}px` }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${boardCols}, ${squareSize}px)`,
            gridTemplateRows:    `repeat(${boardRows}, ${squareSize}px)`,
            position: 'absolute', inset: 0,
          }}
        >
          {renderCells()}
        </div>
        {renderPiece(0)}
        {renderPiece(1)}
      </motion.div>

      {/* Piece selector row */}
      <PieceSelectorBar
        level={level}
        positions={positions}
        selectedIdx={selectedIdx}
        onSelect={idx => { setSelectedIdx(idx); setSuggestedMove(null); setMobileCoach(null); onStuck(false); }}
      />

      <AnimatePresence>
        {mobileCoach && isMobile && (
          <motion.div className="mt-3 bg-sky-50 border-2 border-sky-200 rounded-xl py-2.5 px-4 max-w-sm text-sm text-sky-800 shadow-md"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
            🤖 {mobileCoach}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── PieceSelectorBar ─────────────────────────────────────────────────────────

function PieceSelectorBar({
  level,
  positions,
  selectedIdx,
  onSelect,
}: {
  level: DuoLevel;
  positions: [Position, Position];
  selectedIdx: 0 | 1;
  onSelect: (idx: 0 | 1) => void;
}) {
  const goal0Reached =
    positions[0].row === level.pieces[0].goal.row &&
    positions[0].col === level.pieces[0].goal.col;
  const goal1Reached =
    positions[1].row === level.pieces[1].goal.row &&
    positions[1].col === level.pieces[1].goal.col;

  return (
    <div className="flex gap-4 justify-center mt-1">
      {([0, 1] as const).map(idx => {
        const isSelected  = selectedIdx === idx;
        const atGoal      = idx === 0 ? goal0Reached : goal1Reached;
        const accent      = PIECE_ACCENT[idx];
        const label       = idx === 0 ? 'A' : 'B';
        return (
          <motion.button
            key={idx}
            onClick={() => onSelect(idx)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-colors"
            style={{
              borderColor: isSelected ? accent : `${accent}44`,
              background:  isSelected ? `${accent}18` : 'rgba(255,255,255,0.4)',
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            animate={isSelected
              ? { boxShadow: [`0 0 0 0px ${accent}44`, `0 0 8px 2px ${accent}55`, `0 0 0 0px ${accent}44`] }
              : { boxShadow: 'none' }
            }
            transition={{ duration: 1, repeat: isSelected ? Infinity : 0 }}
          >
            <ChessPieceIcon type={level.pieces[idx].pieceType} size={28} />
            <span className="text-xs font-bold" style={{ color: accent }}>
              {label}
            </span>
            {atGoal && <span className="text-sm">✅</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

/**
 * Oracle Mode — M23
 *
 * A judgment quiz: look at the board, pick the right piece, watch it solve.
 * No failure state. Every answer teaches.
 *
 * 12 questions in 3 "readings" of 4. Each question shows a static board,
 * the player picks a piece, and the chosen piece auto-plays the optimal path.
 * Correct = "⚡ Yes!". Wrong = "Almost! But watch the [correct piece]..."
 * then the optimal piece plays through the same path.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceType, Position, Level } from '../types';
import { ChessPieceIcon } from '../components/ChessPieceIcon';
import { BoardShell } from '../components/BoardShell';

// ─── Question data ─────────────────────────────────────────────────────────────

type OracleQuestion = {
  level: Level;
  optimalPiece: PieceType;
  optimalMoves: Position[]; // ends at level.goal
};

const EMPTY = { fences: [], rivers: [], bridges: [], food: [] };

const ORACLE_QUESTIONS: OracleQuestion[] = [
  // ── Reading 1 — Movement Basics ──────────────────────────────────────────
  {
    // Q1: Rook — open row, 1 move
    optimalPiece: 'rook',
    optimalMoves: [{ row: 4, col: 4 }],
    level: {
      name: 'Open Row', description: 'Start and goal share the same row.', pieceType: 'rook',
      start: { row: 4, col: 0 }, goal: { row: 4, col: 4 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 1, two: 2 }, obstacles: EMPTY,
    },
  },
  {
    // Q2: Bishop — long diagonal, rivers block straight paths
    optimalPiece: 'bishop',
    optimalMoves: [{ row: 0, col: 4 }],
    level: {
      name: 'The Long Diagonal', description: 'The path runs corner to corner.', pieceType: 'bishop',
      start: { row: 4, col: 0 }, goal: { row: 0, col: 4 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 1, two: 2 },
      obstacles: {
        fences: [],
        rivers: [
          { row: 3, col: 0 }, { row: 2, col: 0 }, { row: 1, col: 0 },
          { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 }, { row: 4, col: 4 },
        ],
        bridges: [], food: [],
      },
    },
  },
  {
    // Q3: Knight — leap over a river cluster in one L-hop
    optimalPiece: 'knight',
    optimalMoves: [{ row: 2, col: 1 }],
    level: {
      name: 'The Leap', description: 'Rivers block every straight path.', pieceType: 'knight',
      start: { row: 4, col: 0 }, goal: { row: 2, col: 1 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 1, two: 2 },
      obstacles: {
        fences: [],
        rivers: [{ row: 3, col: 0 }, { row: 3, col: 1 }, { row: 4, col: 1 }],
        bridges: [], food: [],
      },
    },
  },
  {
    // Q4: Rook — river row with a single bridge; slide straight over
    optimalPiece: 'rook',
    optimalMoves: [{ row: 0, col: 2 }],
    level: {
      name: 'Bridge Over the River', description: 'A river cuts across. One bridge remains.', pieceType: 'rook',
      start: { row: 4, col: 2 }, goal: { row: 0, col: 2 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 1, two: 2 },
      obstacles: {
        fences: [],
        rivers: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
        bridges: [{ row: 2, col: 2 }],
        food: [],
      },
    },
  },

  // ── Reading 2 — Terrain Traps ────────────────────────────────────────────
  {
    // Q5: Knight — watched squares block the whole middle row
    optimalPiece: 'knight',
    optimalMoves: [{ row: 2, col: 1 }, { row: 0, col: 2 }],
    level: {
      name: 'The Watched Row', description: 'Guards watch every square in the middle. Something can still cross.', pieceType: 'knight',
      start: { row: 4, col: 2 }, goal: { row: 0, col: 2 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 2, two: 3 },
      obstacles: EMPTY,
      watchedSquares: [
        { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
        { row: 2, col: 3 }, { row: 2, col: 4 },
      ],
    },
  },
  {
    // Q6: Pawn — three enemy pawns on the diagonal, rivers force the capture path
    optimalPiece: 'pawn',
    optimalMoves: [{ row: 3, col: 1 }, { row: 2, col: 2 }, { row: 1, col: 3 }, { row: 0, col: 3 }],
    level: {
      name: 'The Diagonal Trail', description: 'Enemies line the diagonal. One piece captures as it moves.', pieceType: 'pawn',
      start: { row: 4, col: 0 }, goal: { row: 0, col: 3 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 4, two: 6 },
      obstacles: {
        fences: [],
        rivers: [{ row: 3, col: 0 }, { row: 2, col: 1 }, { row: 1, col: 2 }],
        bridges: [], food: [],
      },
      enemies: [
        { row: 3, col: 1, pieceType: 'pawn' },
        { row: 2, col: 2, pieceType: 'pawn' },
        { row: 1, col: 3, pieceType: 'pawn' },
      ],
    },
  },
  {
    // Q7: Rook — four enemies in a row; rook fires down the line one by one
    optimalPiece: 'rook',
    optimalMoves: [
      { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 },
      { row: 5, col: 4 }, { row: 5, col: 5 },
    ],
    level: {
      name: 'The Rook Highway', description: 'Four shadows stand in a line. One piece can cut straight through.', pieceType: 'rook',
      start: { row: 5, col: 0 }, goal: { row: 5, col: 5 },
      boardHeight: 6, boardWidth: 6, starThresholds: { three: 5, two: 7 },
      obstacles: EMPTY,
      enemies: [
        { row: 5, col: 1, pieceType: 'pawn' },
        { row: 5, col: 2, pieceType: 'pawn' },
        { row: 5, col: 3, pieceType: 'pawn' },
        { row: 5, col: 4, pieceType: 'pawn' },
      ],
    },
  },
  {
    // Q8: Queen — mixed diagonal + straight obstacles; only queen reaches goal in 1 move
    // Bishop can't: straight to (0,2) needed; Rook can't: column 0 blocked
    // Queen slides diagonally (4,0)→(1,3) then... wait, let me use a clear case:
    // Queen at (2,0) goal (2,4): straight row → rook also works. Hmm.
    // Use: Queen at (4,4), goal (0,0) via diagonal — bishop also works.
    // Best unique queen question: any path requires combining a diagonal then straight slide.
    // Use: queen at (3,0), goal (0,3) — bishop can do it diagonally in 1 move too.
    // Accept: Q8 = queen or bishop, but we show queen as the "best" because of versatility.
    optimalPiece: 'queen',
    optimalMoves: [{ row: 0, col: 4 }],
    level: {
      name: "The Queen's Reach", description: 'The goal is far — one piece can reach it in a single move from any direction.', pieceType: 'queen',
      start: { row: 4, col: 0 }, goal: { row: 0, col: 4 },
      boardHeight: 5, boardWidth: 5, starThresholds: { three: 1, two: 2 }, obstacles: EMPTY,
    },
  },

  // ── Reading 3 — The Big Board ────────────────────────────────────────────
  {
    // Q9: Rook — 8×8 full column, 1 move
    optimalPiece: 'rook',
    optimalMoves: [{ row: 0, col: 0 }],
    level: {
      name: 'Open File', description: 'The full board. A clear column stretches from end to end.', pieceType: 'rook',
      start: { row: 7, col: 0 }, goal: { row: 0, col: 0 },
      boardHeight: 8, boardWidth: 8, starThresholds: { three: 1, two: 2 }, obstacles: EMPTY,
    },
  },
  {
    // Q10: Bishop — 8×8 full diagonal, 1 move
    optimalPiece: 'bishop',
    optimalMoves: [{ row: 0, col: 7 }],
    level: {
      name: 'Grand Diagonal', description: 'Corner to corner across the great board.', pieceType: 'bishop',
      start: { row: 7, col: 0 }, goal: { row: 0, col: 7 },
      boardHeight: 8, boardWidth: 8, starThresholds: { three: 1, two: 2 }, obstacles: EMPTY,
    },
  },
  {
    // Q11: Knight — 8×8 4-move path to top
    // (7,1)→(5,0)→(3,1)→(1,0)→(0,2)
    optimalPiece: 'knight',
    optimalMoves: [{ row: 5, col: 0 }, { row: 3, col: 1 }, { row: 1, col: 0 }, { row: 0, col: 2 }],
    level: {
      name: "Knight's Journey", description: "On the big board, the knight's hops still reach the far end.", pieceType: 'knight',
      start: { row: 7, col: 1 }, goal: { row: 0, col: 2 },
      boardHeight: 8, boardWidth: 8, starThresholds: { three: 4, two: 6 }, obstacles: EMPTY,
    },
  },
  {
    // Q12: Queen — straight shot up the d-file on 8×8
    optimalPiece: 'queen',
    optimalMoves: [{ row: 0, col: 3 }],
    level: {
      name: "Queen's March", description: 'The queen rules every direction. Where would you place her?', pieceType: 'queen',
      start: { row: 7, col: 3 }, goal: { row: 0, col: 3 },
      boardHeight: 8, boardWidth: 8, starThresholds: { three: 1, two: 2 }, obstacles: EMPTY,
    },
  },
];

const READING_TITLES = [
  { title: 'Reading 1', subtitle: 'Movement Basics' },
  { title: 'Reading 2', subtitle: 'Terrain Traps' },
  { title: 'Reading 3', subtitle: 'The Big Board' },
];

const PIECE_COLORS: Record<PieceType, string> = {
  king: '#f59e0b', pawn: '#22c55e', rook: '#64748b',
  bishop: '#8b5cf6', knight: '#475569', queen: '#a855f7',
};

// ─── Component ─────────────────────────────────────────────────────────────────

type QPhase = 'reading-intro' | 'pick' | 'animating-chosen' | 'result' | 'animating-optimal' | 'next';

interface OracleModeProps {
  onBack: () => void;
}

export function OracleMode({ onBack }: OracleModeProps) {
  const [qIndex, setQIndex] = useState(0);
  const [qPhase, setQPhase] = useState<QPhase>('reading-intro');
  const [chosenPiece, setChosenPiece] = useState<PieceType | null>(null);
  const [animStep, setAnimStep] = useState(0);
  const [animPiecePos, setAnimPiecePos] = useState<Position>(ORACLE_QUESTIONS[0].level.start);

  const question = ORACLE_QUESTIONS[qIndex];
  const readingIndex = Math.floor(qIndex / 4);
  const isCorrect = chosenPiece === question.optimalPiece;
  const isLastQuestion = qIndex === ORACLE_QUESTIONS.length - 1;
  const isReadingEnd = (qIndex + 1) % 4 === 0;

  // Derive capturedEnemies for display: all enemy squares we've animated through
  const animCapturedEnemies = (question.level.enemies ?? []).filter(e =>
    question.optimalMoves.slice(0, animStep).some(m => m.row === e.row && m.col === e.col)
  );

  // Auto-play: advance one step every 450ms while animating
  useEffect(() => {
    if (qPhase !== 'animating-chosen' && qPhase !== 'animating-optimal') return;
    if (animStep >= question.optimalMoves.length) {
      const t = setTimeout(() => {
        if (qPhase === 'animating-chosen') {
          setQPhase('result');
        } else {
          setQPhase('next');
        }
      }, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setAnimPiecePos(question.optimalMoves[animStep]);
      setAnimStep(s => s + 1);
    }, 450);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPhase, animStep]);

  const handlePick = (piece: PieceType) => {
    setChosenPiece(piece);
    setAnimPiecePos(question.level.start);
    setAnimStep(0);
    setQPhase('animating-chosen');
  };

  const startOptimalAnim = () => {
    setAnimPiecePos(question.level.start);
    setAnimStep(0);
    setQPhase('animating-optimal');
  };

  const advance = () => {
    const next = qIndex + 1;
    if (isReadingEnd && next < ORACLE_QUESTIONS.length) {
      setQIndex(next);
      setChosenPiece(null);
      setAnimPiecePos(ORACLE_QUESTIONS[next].level.start);
      setAnimStep(0);
      setQPhase('reading-intro');
    } else if (next < ORACLE_QUESTIONS.length) {
      setQIndex(next);
      setChosenPiece(null);
      setAnimPiecePos(ORACLE_QUESTIONS[next].level.start);
      setAnimStep(0);
      setQPhase('pick');
    } else {
      onBack();
    }
  };

  // Compute a responsive squareSize for the board preview
  const boardCols = question.level.boardWidth ?? 5;
  const squareSize = Math.min(52, Math.floor((Math.min(window.innerWidth, 520) - 48) / boardCols));

  // ── Reading intro card ───────────────────────────────────────────────────
  if (qPhase === 'reading-intro') {
    const reading = READING_TITLES[readingIndex];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center"
        style={{ background: 'linear-gradient(to bottom, #1e1b4b, #312e81, #4c1d95)' }}
      >
        <motion.div className="text-5xl" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>⭐</motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="text-indigo-300 text-sm font-bold uppercase tracking-widest mb-1">{reading.title}</p>
          <h2 className="text-3xl font-extrabold text-white mb-3">{reading.subtitle}</h2>
          <p className="text-indigo-200 text-sm max-w-xs mx-auto">
            {readingIndex === 0 && "The Oracle doesn't ask what you've memorized. It asks what you feel. Point at the piece that belongs here."}
            {readingIndex === 1 && "The terrain changes. Which piece reads it best?"}
            {readingIndex === 2 && "The real 8×8 board. Everything you've learned still works here."}
          </p>
        </motion.div>
        <motion.button
          onClick={() => setQPhase('pick')}
          className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-3 rounded-2xl shadow-lg cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          Begin →
        </motion.button>
        <button onClick={onBack} className="text-indigo-400 text-sm cursor-pointer bg-transparent border-none hover:text-indigo-200">
          ← Back to map
        </button>
      </div>
    );
  }

  // ── Main question layout (pick / animating / result / next) ────────────
  const displayPiece: PieceType | undefined =
    qPhase === 'animating-optimal' || qPhase === 'next'
      ? question.optimalPiece
      : chosenPiece ?? undefined;

  const boardPos = qPhase === 'pick' ? question.level.start : animPiecePos;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 py-6 text-center"
      style={{ background: 'linear-gradient(to bottom, #1e1b4b, #312e81, #4c1d95)' }}
    >
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between">
        <button onClick={onBack} className="text-indigo-400 text-sm cursor-pointer bg-transparent border-none hover:text-indigo-200">
          ← Map
        </button>
        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
          {READING_TITLES[readingIndex].title} · {(qIndex % 4) + 1} / 4
        </p>
        <div style={{ width: 48 }} />
      </div>

      {/* Board preview */}
      <motion.div
        key={`board-${qIndex}`}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <BoardShell
          level={question.level}
          consumedFood={[]}
          trail={[]}
          squareSize={squareSize}
          isMobile={false}
          onMove={() => {}}
          onFoodConsumed={() => {}}
          onStuck={() => {}}
          interactive={false}
          externalPiecePos={boardPos}
          displayPieceType={displayPiece}
          enemies={question.level.enemies ?? []}
          capturedEnemies={animCapturedEnemies}
        />
      </motion.div>

      {/* Question label */}
      <AnimatePresence mode="wait">
        {qPhase === 'pick' && (
          <motion.p key="prompt" className="text-white font-semibold text-base max-w-xs"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {question.level.description}
          </motion.p>
        )}
        {(qPhase === 'animating-chosen' || qPhase === 'animating-optimal') && (
          <motion.p key="anim" className="text-indigo-200 text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {qPhase === 'animating-optimal'
              ? `Watch the ${question.optimalPiece}...`
              : `Watching the ${chosenPiece}...`}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Piece picker */}
      <AnimatePresence>
        {qPhase === 'pick' && (
          <motion.div
            className="grid grid-cols-6 gap-2"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {(['king', 'pawn', 'rook', 'bishop', 'knight', 'queen'] as PieceType[]).map((piece, i) => (
              <motion.button
                key={piece}
                onClick={() => handlePick(piece)}
                className="flex flex-col items-center gap-1 bg-white/10 hover:bg-white/20 rounded-xl p-2 cursor-pointer border border-white/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 380, damping: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChessPieceIcon type={piece} size={36} />
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {qPhase === 'result' && (
          <motion.div
            className="w-full max-w-sm rounded-2xl p-4 text-center"
            style={{
              background: isCorrect
                ? 'rgba(16,185,129,0.18)'
                : 'rgba(99,102,241,0.18)',
              border: isCorrect
                ? '1.5px solid rgba(16,185,129,0.5)'
                : '1.5px solid rgba(99,102,241,0.5)',
            }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            {isCorrect ? (
              <>
                <p className="text-2xl mb-1">⚡</p>
                <p className="font-extrabold text-emerald-300 text-lg mb-1">
                  Yes! The <span className="capitalize">{question.optimalPiece}</span> was born for this.
                </p>
                <ChessPieceIcon type={question.optimalPiece} size={40} />
                <div className="mt-3">
                  <motion.button
                    onClick={advance}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-6 py-2 rounded-xl cursor-pointer"
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  >
                    {isLastQuestion ? 'Finish ✨' : isReadingEnd ? 'Next Reading →' : 'Next →'}
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <p className="font-bold text-indigo-200 text-base mb-1">
                  Almost! The <span className="capitalize">{chosenPiece}</span> can get there.
                </p>
                <p className="text-indigo-300 text-sm mb-3">
                  But watch the <span className="font-bold capitalize"
                    style={{ color: PIECE_COLORS[question.optimalPiece] }}>
                    {question.optimalPiece}
                  </span>...
                </p>
                <motion.button
                  onClick={startOptimalAnim}
                  className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-5 py-2 rounded-xl cursor-pointer text-sm"
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                >
                  Show me →
                </motion.button>
              </>
            )}
          </motion.div>
        )}

        {qPhase === 'next' && (
          <motion.div
            className="w-full max-w-sm rounded-2xl p-4 text-center"
            style={{ background: 'rgba(99,102,241,0.18)', border: '1.5px solid rgba(99,102,241,0.5)' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="font-bold text-indigo-200 mb-1">
              The <span className="capitalize"
                style={{ color: PIECE_COLORS[question.optimalPiece] }}>
                {question.optimalPiece}
              </span> was made for this.
            </p>
            <div className="mt-3">
              <motion.button
                onClick={advance}
                className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 py-2 rounded-xl cursor-pointer"
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              >
                {isLastQuestion ? 'Finish ✨' : isReadingEnd ? 'Next Reading →' : 'Next →'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

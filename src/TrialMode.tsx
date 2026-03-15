/**
 * TrialMode — a 3-question mastery check that fires after each world's final level.
 *
 * Two question types:
 *   onemove  — show a mini board; player taps the flag to reach it in one move
 *   contrast — yes/no question about the piece's movement rules
 *
 * Scoring:
 *   ≥ 2/3 correct → pass (story beat plays)
 *   < 2/3           → retry/hint screen
 *   after 2 failures → "keep going anyway" option always visible
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { PieceType, Obstacle, Position } from './types';
import { getValidMoves } from './utils/moveCalculator';
import { WORLDS } from './adventure/worlds';

// ─── Question types ───────────────────────────────────────────────────────────

type OneMoveQ = {
  type: 'onemove';
  prompt: string;
  pieceType: PieceType;
  start: Position;
  goal: Position;
  obstacles: Obstacle;
};

type ContrastQ = {
  type: 'contrast';
  prompt: string;
  /** true = correct answer is YES, false = correct answer is NO */
  answer: boolean;
  explanation: string;
};

type TrialQuestion = OneMoveQ | ContrastQ;

// ─── Trial data ───────────────────────────────────────────────────────────────

const E: Obstacle = { fences: [], rivers: [], bridges: [], food: [] };

const TRIAL_QUESTIONS: Record<number, TrialQuestion[]> = {
  0: [
    {
      type: 'onemove',
      prompt: 'Move the king to the flag in one step!',
      pieceType: 'king',
      start: { row: 3, col: 2 },
      goal:  { row: 2, col: 3 }, // diagonal up-right
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'The king can step sideways too. One move to the flag!',
      pieceType: 'king',
      start: { row: 2, col: 1 },
      goal:  { row: 2, col: 2 }, // one step right
      obstacles: E,
    },
    {
      type: 'contrast',
      prompt: 'A king can only move in straight lines — not diagonally.',
      answer: false,
      explanation: 'FALSE! The king moves in ALL 8 directions — including diagonals.',
    },
  ],
  1: [
    {
      type: 'onemove',
      prompt: 'Step the pawn one square forward to the flag!',
      pieceType: 'pawn',
      start: { row: 4, col: 2 },
      goal:  { row: 3, col: 2 },
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'There is an apple at the flag — eat it to get there!',
      pieceType: 'pawn',
      start: { row: 3, col: 1 },
      goal:  { row: 2, col: 2 },
      obstacles: { ...E, food: [{ row: 2, col: 2 }] },
    },
    {
      type: 'contrast',
      prompt: 'Can the pawn move backward?',
      answer: false,
      explanation: 'No! The pawn always marches forward — it never goes back.',
    },
  ],
  2: [
    {
      type: 'onemove',
      prompt: 'Slide the rook all the way across to the flag!',
      pieceType: 'rook',
      start: { row: 2, col: 0 },
      goal:  { row: 2, col: 4 },
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'Slide the rook straight up to the flag!',
      pieceType: 'rook',
      start: { row: 4, col: 2 },
      goal:  { row: 0, col: 2 },
      obstacles: E,
    },
    {
      type: 'contrast',
      prompt: 'Can the rook move diagonally?',
      answer: false,
      explanation: 'No! The rook only moves in straight lines — up, down, left, or right.',
    },
  ],
  3: [
    {
      type: 'onemove',
      prompt: 'Slide the bishop diagonally to the flag!',
      pieceType: 'bishop',
      start: { row: 4, col: 0 },
      goal:  { row: 2, col: 2 },
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'One diagonal move to the flag!',
      pieceType: 'bishop',
      start: { row: 4, col: 4 },
      goal:  { row: 2, col: 2 },
      obstacles: E,
    },
    {
      type: 'contrast',
      prompt: 'Can the bishop move in a straight line (up, down, left, or right)?',
      answer: false,
      explanation: 'No! The bishop only moves diagonally — never in straight lines.',
    },
  ],
  4: [
    {
      type: 'onemove',
      prompt: 'The knight jumps in an L-shape — one hop to the flag!',
      pieceType: 'knight',
      start: { row: 4, col: 1 },
      goal:  { row: 2, col: 2 }, // 2 up, 1 right
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'Jump the knight to the flag!',
      pieceType: 'knight',
      start: { row: 2, col: 2 },
      goal:  { row: 0, col: 1 }, // 2 up, 1 left
      obstacles: E,
    },
    {
      type: 'contrast',
      prompt: 'Can the knight jump over fences and rivers?',
      answer: true,
      explanation: 'YES! The knight jumps through the air — fences and rivers cannot stop it.',
    },
  ],
  5: [
    {
      type: 'onemove',
      prompt: 'Slide the queen straight to the flag!',
      pieceType: 'queen',
      start: { row: 4, col: 2 },
      goal:  { row: 0, col: 2 },
      obstacles: E,
    },
    {
      type: 'onemove',
      prompt: 'The queen can go diagonally too — reach the flag!',
      pieceType: 'queen',
      start: { row: 4, col: 0 },
      goal:  { row: 2, col: 2 },
      obstacles: E,
    },
    {
      type: 'contrast',
      prompt: 'Can the queen move both diagonally AND in straight lines?',
      answer: true,
      explanation: 'YES! The queen combines the rook and bishop — she moves in every direction.',
    },
  ],
};

const HINT_TEXT: Record<number, string> = {
  0: 'The king moves exactly one step in any of 8 directions (including diagonals).',
  1: 'The pawn moves one square forward, or two squares on its first move. It only eats diagonally.',
  2: 'The rook slides as far as it wants in a straight line — up, down, left, or right.',
  3: 'The bishop slides diagonally in any direction. It always stays on the same color square.',
  4: 'The knight jumps in an L-shape (2+1 squares). It jumps over anything in the way.',
  5: 'The queen moves like a rook AND a bishop combined — any direction, any distance.',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrialModeProps {
  worldId: number;
  onPass: () => void;
  onSkip: () => void;
}

// ─── TrialMode ────────────────────────────────────────────────────────────────

export function TrialMode({ worldId, onPass, onSkip }: TrialModeProps) {
  const world = WORLDS[worldId];
  const questions = TRIAL_QUESTIONS[worldId] ?? TRIAL_QUESTIONS[2];

  const [qIdx, setQIdx]             = useState(0);
  const [score, setScore]           = useState(0);
  const [phase, setPhase]           = useState<'question' | 'feedback' | 'result'>('question');
  const [wasCorrect, setWasCorrect] = useState(false);
  const [failCount, setFailCount]   = useState(0);
  const [showHint, setShowHint]     = useState(false);

  const currentQ = questions[qIdx];

  const handleAnswer = (correct: boolean) => {
    const newScore = score + (correct ? 1 : 0);
    setWasCorrect(correct);
    setPhase('feedback');

    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(i => i + 1);
        setScore(newScore);
        setPhase('question');
      } else {
        setScore(newScore);
        setPhase('result');
      }
    }, 1300);
  };

  const handleRetry = () => {
    setQIdx(0);
    setScore(0);
    setPhase('question');
    setShowHint(false);
    setFailCount(f => f + 1);
  };

  // ── Result screen ──
  if (phase === 'result') {
    const passed = score >= 2;

    if (passed) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
          style={{ background: world.palette.bg }}
        >
          <motion.div
            className="max-w-sm w-full"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          >
            <div className="text-6xl mb-4">{score === 3 ? '🏆' : '⭐'}</div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
              {score === 3 ? 'Perfect!' : 'Well done!'}
            </h2>
            <p className="text-gray-600 mb-6">{score} out of {questions.length} correct.</p>
            <motion.button
              onClick={onPass}
              className="w-full text-white font-bold text-xl py-4 rounded-2xl shadow-lg cursor-pointer"
              style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              Continue the story →
            </motion.button>
          </motion.div>
        </div>
      );
    }

    // Failed — retry / hint / skip
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
        style={{ background: world.palette.bg }}
      >
        <motion.div
          className="max-w-sm w-full"
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        >
          <div className="text-5xl mb-4">💪</div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Almost!</h2>
          <p className="text-gray-600 mb-5">
            {score} out of {questions.length} correct. Want to try again?
          </p>

          <AnimatePresence>
            {showHint && (
              <motion.div
                className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-4 mb-5 text-sm text-sky-800 text-left"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                💡 <span className="font-semibold">Hint:</span> {HINT_TEXT[worldId] ?? ''}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-3">
            <motion.button
              onClick={handleRetry}
              className="w-full text-white font-bold text-lg py-3 rounded-2xl shadow-md cursor-pointer"
              style={{ background: `linear-gradient(to right, ${world.palette.nodeColor}, ${world.palette.accent})` }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>

            {!showHint && (
              <button
                onClick={() => setShowHint(true)}
                className="text-sm font-medium text-sky-600 hover:underline cursor-pointer bg-transparent border-none"
              >
                Show me a hint
              </button>
            )}

            {(failCount >= 1 || showHint) && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-none"
              >
                Keep going anyway →
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Question screen ──
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: world.palette.bg }}
    >
      {/* Progress dots */}
      <div className="flex gap-2 mb-5">
        {questions.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: 10, height: 10,
              background: i < qIdx
                ? world.palette.accent
                : i === qIdx
                ? world.palette.nodeColor
                : '#d1d5db',
              transform: i === qIdx ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
        Question {qIdx + 1} of {questions.length}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          className="max-w-sm w-full"
          initial={{ x: 36, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -36, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {currentQ.type === 'onemove' ? (
            <OneMoveQuestion
              question={currentQ}
              onAnswer={handleAnswer}
              feedbackActive={phase === 'feedback'}
              wasCorrect={wasCorrect}
            />
          ) : (
            <ContrastQuestion
              question={currentQ}
              onAnswer={handleAnswer}
              feedbackActive={phase === 'feedback'}
              wasCorrect={wasCorrect}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── OneMoveQuestion ──────────────────────────────────────────────────────────

function OneMoveQuestion({
  question,
  onAnswer,
  feedbackActive,
  wasCorrect,
}: {
  question: OneMoveQ;
  onAnswer: (correct: boolean) => void;
  feedbackActive: boolean;
  wasCorrect: boolean;
}) {
  const { pieceType, start, goal, obstacles } = question;
  const validMoves = getValidMoves(pieceType, start, obstacles);

  const tap = (row: number, col: number) => {
    if (feedbackActive) return;
    const reachable = validMoves.some(m => m.row === row && m.col === col);
    const isGoal = row === goal.row && col === goal.col;
    onAnswer(isGoal && reachable);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-lg font-bold text-gray-800 text-center px-2">{question.prompt}</p>

      {/* Mini board */}
      <div
        className="rounded-2xl overflow-hidden shadow-xl border-2 border-white/70"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 58px)', gap: 2, background: '#cbd5e1', padding: 2 }}
      >
        {Array.from({ length: 25 }, (_, i) => {
          const r = Math.floor(i / 5);
          const c = i % 5;
          const isPiece  = r === start.row && c === start.col;
          const isGoal   = r === goal.row  && c === goal.col;
          const isValid  = validMoves.some(m => m.row === r && m.col === c);
          const isRiver  = obstacles.rivers.some(x => x.row === r && x.col === c);
          const isFood   = obstacles.food.some(x => x.row === r && x.col === c);

          let bg = '#f0fdf4';
          if (isRiver) bg = '#bfdbfe';
          else if (isValid && !isPiece) bg = '#d1fae5';

          return (
            <button
              key={i}
              onClick={() => tap(r, c)}
              disabled={feedbackActive || isPiece}
              style={{
                width: 58, height: 58,
                background: bg,
                border: 'none',
                borderRadius: 6,
                cursor: isValid && !isPiece ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {isPiece && <ChessPieceIcon type={pieceType} size={40} />}
              {isGoal && !isPiece && <span style={{ fontSize: 26 }}>🚩</span>}
              {isFood && !isGoal && !isPiece && <span style={{ fontSize: 22 }}>🍎</span>}
              {isValid && !isGoal && !isPiece && !isFood && (
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'block', opacity: 0.65 }} />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {feedbackActive && (
          <motion.div
            className={`px-5 py-2.5 rounded-2xl font-bold text-white ${wasCorrect ? 'bg-emerald-500' : 'bg-rose-400'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {wasCorrect ? '✓ Correct!' : '✗ Not quite — keep going!'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ContrastQuestion ─────────────────────────────────────────────────────────

function ContrastQuestion({
  question,
  onAnswer,
  feedbackActive,
  wasCorrect,
}: {
  question: ContrastQ;
  onAnswer: (correct: boolean) => void;
  feedbackActive: boolean;
  wasCorrect: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="bg-white/75 backdrop-blur rounded-2xl p-6 shadow-md w-full text-center">
        <p className="text-xl font-bold text-gray-800 leading-snug">{question.prompt}</p>
      </div>

      <div className="flex gap-4 w-full">
        {([true, false] as const).map(choice => (
          <motion.button
            key={String(choice)}
            onClick={() => !feedbackActive && onAnswer(choice === question.answer)}
            disabled={feedbackActive}
            className="flex-1 py-5 rounded-2xl text-white font-extrabold text-2xl shadow-md cursor-pointer"
            style={{ background: choice ? '#22c55e' : '#ef4444' }}
            whileHover={{ scale: feedbackActive ? 1 : 1.04 }}
            whileTap={{ scale: feedbackActive ? 1 : 0.95 }}
          >
            {choice ? 'YES 👍' : 'NO 👎'}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {feedbackActive && (
          <motion.div
            className={`px-5 py-3 rounded-2xl font-semibold text-white text-sm text-center max-w-xs ${wasCorrect ? 'bg-emerald-500' : 'bg-rose-400'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {wasCorrect ? '✓ ' : '✗ '}{question.explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

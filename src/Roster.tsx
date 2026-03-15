/**
 * Roster — a horizontal bar of piece icons showing earned allies.
 *
 * King is always shown (the player's own piece).
 * Earned pieces glow with their world color.
 * Unearned pieces appear as grey silhouettes.
 * Tapping any piece shows a brief tooltip.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessPieceIcon } from './components/ChessPieceIcon';
import { PieceType } from './types';
import { WORLDS } from './adventure/worlds';

// ─── Piece order and flavor text ─────────────────────────────────────────────

type RosterEntry = {
  piece: PieceType;
  worldId: number;
  flavor: string;
};

const ROSTER: RosterEntry[] = [
  { piece: 'king',   worldId: 0, flavor: 'A small king with a big heart.' },
  { piece: 'pawn',   worldId: 1, flavor: 'Patient and brave. One step at a time.' },
  { piece: 'rook',   worldId: 2, flavor: 'Steady as a wall. Fast as a road.' },
  { piece: 'bishop', worldId: 3, flavor: 'Sees the world in diagonals.' },
  { piece: 'knight', worldId: 4, flavor: 'Jumps where others cannot follow.' },
  { piece: 'queen',  worldId: 5, flavor: 'Reaches everything. The last to join.' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface RosterProps {
  completedWorlds: number[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Roster({ completedWorlds }: RosterProps) {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  const handleTap = (idx: number) => {
    setActiveTooltip(prev => (prev === idx ? null : idx));
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 bg-white/40 backdrop-blur rounded-2xl px-4 py-2.5 shadow-md">
        {ROSTER.map((entry, idx) => {
          const earned = entry.worldId === 0 || completedWorlds.includes(entry.worldId);
          const world = WORLDS[entry.worldId];
          const isActive = activeTooltip === idx;

          return (
            <motion.button
              key={entry.piece}
              onClick={() => handleTap(idx)}
              className="relative flex flex-col items-center focus:outline-none cursor-pointer bg-transparent border-none p-0"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Glow ring for earned pieces */}
              {earned && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  animate={{ boxShadow: [
                    `0 0 6px 2px ${world.palette.nodeColor}55`,
                    `0 0 12px 4px ${world.palette.nodeColor}88`,
                    `0 0 6px 2px ${world.palette.nodeColor}55`,
                  ]}}
                  transition={{ duration: 2.4, repeat: Infinity }}
                />
              )}

              {/* Piece icon — grey filter when unearned */}
              <div style={{ filter: earned ? 'none' : 'grayscale(1) opacity(0.35)' }}>
                <ChessPieceIcon type={entry.piece} size={36} />
              </div>

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  className="absolute -bottom-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                  layoutId="rosterDot"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {activeTooltip !== null && (
          <motion.div
            key={activeTooltip}
            className="text-center max-w-xs"
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {(() => {
              const entry = ROSTER[activeTooltip];
              const earned = entry.worldId === 0 || completedWorlds.includes(entry.worldId);
              const world = WORLDS[entry.worldId];
              return (
                <div
                  className="inline-block bg-white/80 backdrop-blur rounded-xl px-4 py-2 shadow-lg text-sm text-gray-700"
                  style={{ borderLeft: `3px solid ${world.palette.nodeColor}` }}
                >
                  {earned ? (
                    <>
                      <span className="font-bold capitalize text-gray-800">{entry.piece} </span>
                      — {entry.flavor}
                    </>
                  ) : (
                    <span className="text-gray-400 italic">
                      Complete {world.name} to unlock the {entry.piece}.
                    </span>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

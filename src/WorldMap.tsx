/**
 * WorldMap — an illustrated overworld showing the six chess-piece worlds
 * on a winding path through a sky-and-meadow landscape.
 *
 * Locked worlds are greyed out with a lock icon.
 * Completed worlds show a gold checkmark ring.
 * Available (unlocked, not yet complete) worlds pulse gently.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORLDS, WorldDef } from './adventure/worlds';
import { Roster } from './Roster';

// ─── SVG coordinate helpers ───────────────────────────────────────────────────

const VW = 400; // SVG viewBox width
const VH = 300; // SVG viewBox height

function worldSVGPos(w: WorldDef) {
  return { x: w.mapPos.x * VW, y: w.mapPos.y * VH };
}

// Build a smooth SVG path through all world nodes
function buildPath(): string {
  const pts = WORLDS.map(worldSVGPos);
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    // Control points: pull toward midpoint for a gentle curve
    const cpX = (prev.x + curr.x) / 2;
    const cpY = (prev.y + curr.y) / 2;
    d += ` Q ${cpX} ${prev.y} ${cpX} ${cpY} Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
  }
  return d;
}

const PATH_D = buildPath();

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorldMapProps {
  completedWorlds: number[];
  unlockedWorlds: number[];
  onSelectWorld: (worldId: number) => void;
  onBack: () => void;
}


// ─── Component ────────────────────────────────────────────────────────────────

export function WorldMap({ completedWorlds, unlockedWorlds, onSelectWorld, onBack }: WorldMapProps) {
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const handleNodeClick = (world: WorldDef) => {
    if (!unlockedWorlds.includes(world.id)) {
      setLockedNotice(`${world.emoji} ${world.name} is not yet open. Keep going!`);
      setTimeout(() => setLockedNotice(null), 2200);
      return;
    }
    onSelectWorld(world.id);
  };

  return (
    <div
      className="relative h-screen flex flex-col select-none overflow-hidden"
      style={{
        background:
          'linear-gradient(to bottom, #29b6f6 0%, #81d4fa 22%, #b3e5fc 42%, #c8e6c9 62%, #66bb6a 80%, #2e7d32 100%)',
      }}
    >
      {/* Decorative horizon clouds */}
      {[15, 45, 72].map((left, i) => (
        <div
          key={i}
          className="absolute pointer-events-none opacity-60"
          style={{ top: `${8 + i * 4}%`, left: `${left}%`, fontSize: 32 + i * 4 }}
        >
          ☁️
        </div>
      ))}

      {/* Title bar */}
      <div className="relative z-10 pt-3 sm:pt-6 px-4 sm:px-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-white/80 hover:text-white text-sm font-medium bg-transparent border-none cursor-pointer"
        >
          ← Title
        </button>
        <h1
          className="text-xl font-extrabold text-white"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          The Friendship Kingdom
        </h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Map SVG */}
      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-2 py-1 sm:py-4">
        <div className="w-full max-w-lg relative" style={{ aspectRatio: `${VW}/${VH}`, maxHeight: '55vh' }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Dashed winding path */}
            <path
              d={PATH_D}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="18 10"
            />
            {/* Solid inner path highlight */}
            <path
              d={PATH_D}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={4}
              strokeLinecap="round"
            />

            {/* World nodes */}
            {WORLDS.map(world => {
              const pos = worldSVGPos(world);
              const completed = completedWorlds.includes(world.id);
              const unlocked = unlockedWorlds.includes(world.id);
              const locked = !unlocked;

              return (
                <g key={world.id} onClick={() => handleNodeClick(world)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                  {/* Pulse ring for available worlds */}
                  {unlocked && !completed && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={26}
                      fill="none"
                      stroke={world.palette.nodeColor}
                      strokeWidth={3}
                      animate={{ r: [26, 33, 26], opacity: [0.7, 0.1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Completed ring */}
                  {completed && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={27}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={4}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={22}
                    fill={locked ? '#94a3b8' : world.palette.nodeColor}
                    opacity={locked ? 0.6 : 1}
                    style={{ filter: unlocked ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' : 'none' }}
                  />

                  {/* Emoji */}
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={locked ? 16 : 20}
                    opacity={locked ? 0.5 : 1}
                  >
                    {world.emoji}
                  </text>

                  {/* Lock icon for locked worlds */}
                  {locked && (
                    <text
                      x={pos.x + 12}
                      y={pos.y - 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={13}
                    >
                      🔒
                    </text>
                  )}

                  {/* Checkmark for completed */}
                  {completed && (
                    <text
                      x={pos.x + 14}
                      y={pos.y - 14}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                    >
                      ✅
                    </text>
                  )}

                  {/* World name label */}
                  <text
                    x={pos.x}
                    y={pos.y + 33}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    fontSize={9}
                    fontWeight="700"
                    fill={locked ? 'rgba(255,255,255,0.45)' : 'white'}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                  >
                    {world.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Locked world notice */}
      <AnimatePresence>
        {lockedNotice && (
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur rounded-2xl px-5 py-3 shadow-xl text-sm text-gray-700 font-semibold whitespace-nowrap"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
          >
            🔒 {lockedNotice}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Roster bar */}
      <div className="relative z-10 pb-2 sm:pb-4 px-4 flex justify-center">
        <Roster completedWorlds={completedWorlds} />
      </div>

      {/* Ground decoration */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end pb-1 pointer-events-none opacity-70 text-3xl">
        {['🌱', '🌻', '🌿', '🍀', '🌸', '🌿', '🌱', '🌼', '🌿'].map((e, i) => (
          <span key={i}>{e}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * WorldMap — an illustrated overworld showing the six chess-piece worlds
 * on a winding path through a sky-and-meadow landscape.
 *
 * Locked worlds are greyed out with a lock icon.
 * Completed worlds show a gold checkmark ring.
 * Available (unlocked, not yet complete) worlds pulse gently.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WORLDS, WorldDef } from './adventure/worlds';
import { Roster } from './Roster';

// ─── SVG coordinate helpers ───────────────────────────────────────────────────

const VW = 400; // SVG viewBox width
const VH = 520; // SVG viewBox height — portrait ratio fills phone screens better

function worldSVGPos(w: WorldDef) {
  return { x: w.mapPos.x * VW, y: w.mapPos.y * VH };
}

// Build a smooth SVG path through the given world nodes
function buildPath(worlds: WorldDef[]): string {
  const pts = worlds.map(worldSVGPos);
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorldMapProps {
  completedWorlds: number[];
  unlockedWorlds: number[];
  onSelectWorld: (worldId: number) => void;
  onBack: () => void;
  /** Called when the player taps a "?" challenge node. Only shown for worlds 0–5 when completed. */
  onSelectChallenge?: (worldId: number) => void;
  /** Called when the player taps the Oracle node. Only shown when world 8 is complete. */
  onSelectOracle?: () => void;
  /** When true, shows a discreet dev-only progress reset button. */
  isDadCheat?: boolean;
}


// ─── Component ────────────────────────────────────────────────────────────────

function clearAllProgress() {
  localStorage.removeItem('scm_adv_progress');
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('tbk_ghost_') || key.startsWith('tbk_attempts_'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
  window.location.reload();
}

export function WorldMap({ completedWorlds, unlockedWorlds, onSelectWorld, onBack, onSelectChallenge, onSelectOracle, isDadCheat }: WorldMapProps) {
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);
  const [resetState, setResetState] = useState<'idle' | 'confirming'>('idle');

  useEffect(() => {
    if (resetState !== 'confirming') return;
    const t = setTimeout(() => setResetState('idle'), 4000);
    return () => clearTimeout(t);
  }, [resetState]);

  // Only show unlocked worlds + the single next locked world (surprise teaser).
  // Worlds further ahead stay hidden so children don't see spoilers.
  const nextLockedId = WORLDS
    .map(w => w.id)
    .filter(id => !unlockedWorlds.includes(id))
    .reduce((min, id) => Math.min(min, id), Infinity);
  const visibleWorlds = WORLDS.filter(w =>
    unlockedWorlds.includes(w.id) || w.id === nextLockedId,
  );
  const mapPath = buildPath(visibleWorlds);

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
        <div className="w-full max-w-lg relative" style={{ aspectRatio: `${VW}/${VH}`, maxHeight: '82vh' }}>
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Dashed winding path */}
            <path
              d={mapPath}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="18 10"
            />
            {/* Solid inner path highlight */}
            <path
              d={mapPath}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {/* Animated draw-in: bright line sweeps the path on mount, then fades */}
            <motion.path
              d={mapPath}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={6}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0.75 }}
              animate={{ pathLength: 1, opacity: 0 }}
              transition={{
                pathLength: { duration: 1.8, ease: 'easeInOut', delay: 0.3 },
                opacity:    { duration: 0.6, delay: 2.0 },
              }}
            />

            {/* World nodes — only visible worlds rendered */}
            {visibleWorlds.map(world => {
              const pos = worldSVGPos(world);
              const completed = completedWorlds.includes(world.id);
              const unlocked = unlockedWorlds.includes(world.id);
              const locked = !unlocked;
              const ariaLabel = locked
                ? `${world.name} — locked`
                : completed
                  ? `${world.name} — completed`
                  : `Play ${world.name}`;

              return (
                <g
                  key={world.id}
                  onClick={() => handleNodeClick(world)}
                  style={{ cursor: locked ? 'default' : 'pointer' }}
                  role="button"
                  aria-label={ariaLabel}
                  tabIndex={locked ? -1 : 0}
                  onKeyDown={e => e.key === 'Enter' && handleNodeClick(world)}
                >
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

                  {/* Completed ring — springs in on mount */}
                  {completed && (
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={27}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={4}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 8, stiffness: 220, delay: world.id * 0.12 }}
                    />
                  )}

                  {/* Sparkle burst for completed nodes */}
                  {completed && [0, 60, 120, 180, 240, 300].map((angle, i) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <motion.circle
                        key={i}
                        cx={pos.x}
                        cy={pos.y}
                        r={3}
                        fill="#fbbf24"
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: Math.cos(rad) * 22, y: Math.sin(rad) * 22, opacity: 0, scale: 0 }}
                        transition={{ duration: 0.55, delay: world.id * 0.12 + i * 0.04, ease: 'easeOut' }}
                      />
                    );
                  })}

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
            {/* Shifting Grounds challenge nodes — "?" bubble near each completed world 0–5 */}
            {onSelectChallenge && WORLDS.filter(w => w.id <= 5).map(world => {
              if (!completedWorlds.includes(world.id)) return null;
              const pos = worldSVGPos(world);
              const nx = pos.x + 26;
              const ny = pos.y - 20;
              return (
                <g
                  key={`challenge-${world.id}`}
                  onClick={() => onSelectChallenge(world.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label={`Shifting Grounds challenge for ${world.name}`}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectChallenge(world.id)}
                >
                  <motion.circle
                    cx={nx} cy={ny} r={11}
                    fill="#f59e0b"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 16, delay: world.id * 0.08 }}
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                  />
                  <motion.circle
                    cx={nx} cy={ny} r={13}
                    fill="none" stroke="#fbbf24" strokeWidth={2}
                    animate={{ r: [13, 16, 13], opacity: [0.7, 0.1, 0.7] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: world.id * 0.15 }}
                  />
                  <text
                    x={nx} y={ny + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontWeight="900" fill="white"
                  >
                    ?
                  </text>
                </g>
              );
            })}
            {/* Oracle node — ⭐ glowing star, visible when world 8 complete */}
            {onSelectOracle && completedWorlds.includes(8) && (() => {
              const ox = 0.50 * VW; // center of map
              const oy = 0.28 * VH;
              return (
                <g
                  key="oracle"
                  onClick={onSelectOracle}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  aria-label="The Oracle — judgment quiz"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelectOracle()}
                >
                  {/* Outer glow ring */}
                  <motion.circle
                    cx={ox} cy={oy} r={16}
                    fill="none" stroke="#a78bfa" strokeWidth={2.5}
                    animate={{ r: [16, 21, 16], opacity: [0.8, 0.15, 0.8] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  {/* Node circle */}
                  <circle cx={ox} cy={oy} r={13} fill="#4c1d95"
                    style={{ filter: 'drop-shadow(0 3px 8px rgba(167,139,250,0.6))' }}
                  />
                  <text x={ox} y={oy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={14}>⭐</text>
                  <text x={ox} y={oy + 23} textAnchor="middle" dominantBaseline="hanging"
                    fontSize={8} fontWeight="700" fill="rgba(196,181,253,0.95)"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    The Oracle
                  </text>
                </g>
              );
            })()}
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

      {/* Dad-cheat: discreet progress reset button */}
      {isDadCheat && (
        <button
          onClick={() => {
            if (resetState === 'idle') {
              setResetState('confirming');
            } else {
              clearAllProgress();
            }
          }}
          className="fixed bottom-4 left-3 text-xs font-medium border-none cursor-pointer rounded-lg px-2 py-1"
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: 'white',
            opacity: resetState === 'confirming' ? 1 : 0.35,
            transition: 'opacity 0.2s',
            zIndex: 50,
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = resetState === 'confirming' ? '1' : '0.35')}
        >
          {resetState === 'idle' ? '⚠ Reset all progress' : 'Tap again to confirm — this erases everything'}
        </button>
      )}

      {/* Ground decoration */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-end pb-1 pointer-events-none opacity-70 text-3xl">
        {['🌱', '🌻', '🌿', '🍀', '🌸', '🌿', '🌱', '🌼', '🌿'].map((e, i) => (
          <span key={i}>{e}</span>
        ))}
      </div>
    </div>
  );
}

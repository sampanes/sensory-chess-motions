import { Level } from '../types';
import { DuoLevel } from './duoLevelDef';

// ─── World definitions ────────────────────────────────────────────────────────

export type WorldPalette = {
  /** CSS gradient string for the playing-screen background. */
  bg: string;
  /** Hex accent colour for level-name / star UI. */
  accent: string;
  /** Tailwind-compatible hex for the map node circle. */
  nodeColor: string;
};

export type WorldStoryBeat = {
  title: string;
  paragraphs: string[];
  /** Small teaser shown on the chapter-complete card. */
  nextTeaser?: string;
  nextTeaserEmoji?: string;
};

export type WorldDef = {
  id: number;
  name: string;
  emoji: string;
  tagline: string;
  palette: WorldPalette;
  story: WorldStoryBeat;
  /** Position on the world map as a fraction of the SVG viewBox (0–1). */
  mapPos: { x: number; y: number };
};

// ─── All worlds ───────────────────────────────────────────────────────────────

export const WORLDS: WorldDef[] = [
  {
    id: 0,
    name: "The King's Start",
    emoji: '🏰',
    tagline: 'The little king finds his way.',
    palette: {
      bg: 'linear-gradient(to bottom, #fef9c3, #fef3c7, #fed7aa)',
      accent: '#b45309',
      nodeColor: '#f59e0b',
    },
    story: {
      title: 'The Kingdom Is Broken',
      paragraphs: [
        'The king walked through the quiet fields of his kingdom. The old stone walls stood, but so much else had crumbled.',
        'He was alone — but not entirely. Beyond the meadow, he could hear them.',
        '"The Pawn folk are out there," he thought. "And they need help."',
      ],
      nextTeaser: "Pawn's Farm",
      nextTeaserEmoji: '🌾',
    },
    mapPos: { x: 0.15, y: 0.78 },
  },
  {
    id: 1,
    name: "Pawn's Farm",
    emoji: '🌾',
    tagline: 'Help the pawns with the harvest.',
    palette: {
      bg: 'linear-gradient(to bottom, #d9f99d, #bbf7d0, #fef9c3)',
      accent: '#15803d',
      nodeColor: '#22c55e',
    },
    story: {
      title: 'The Harvest Is Done',
      paragraphs: [
        'The pawn folk cheered. Every apple was gathered, every fence mended.',
        '"Whenever you need us," said the littlest pawn, standing tall, "just call."',
        'The Pawn joins your party.',
      ],
      nextTeaser: "Rook's Roads",
      nextTeaserEmoji: '🛤️',
    },
    mapPos: { x: 0.36, y: 0.58 },
  },
  {
    id: 2,
    name: "Rook's Roads",
    emoji: '🛤️',
    tagline: 'Build the roads, guard the walls.',
    palette: {
      bg: 'linear-gradient(to bottom, #e2e8f0, #cbd5e1, #bfdbfe)',
      accent: '#475569',
      nodeColor: '#64748b',
    },
    story: {
      title: 'The Roads Hold',
      paragraphs: [
        'The Rook soldiers stand aside. You crossed their roads and found your way.',
        '"We guard the paths," they say. "Now, so will we guard yours."',
        'The Rook joins your party.',
      ],
      nextTeaser: "Bishop's Grove",
      nextTeaserEmoji: '🌲',
    },
    mapPos: { x: 0.57, y: 0.68 },
  },
  {
    id: 3,
    name: "Bishop's Grove",
    emoji: '🌲',
    tagline: 'Follow the diagonals through the forest.',
    palette: {
      bg: 'linear-gradient(to bottom, #e9d5ff, #a5f3fc, #ccfbf1)',
      accent: '#7c3aed',
      nodeColor: '#8b5cf6',
    },
    story: {
      title: 'The Diagonals Revealed',
      paragraphs: [
        'The Bishop folk bow. "You see the diagonals now," the oldest one says.',
        '"That is a gift most never find."',
        'The Bishop joins your party.',
      ],
      nextTeaser: "Knight's Mountains",
      nextTeaserEmoji: '⛰️',
    },
    mapPos: { x: 0.70, y: 0.42 },
  },
  {
    id: 4,
    name: "Knight's Mountains",
    emoji: '⛰️',
    tagline: 'Jump where others cannot go.',
    palette: {
      bg: 'linear-gradient(to bottom, #cbd5e1, #bae6fd, #f0fdf4)',
      accent: '#334155',
      nodeColor: '#475569',
    },
    story: {
      title: 'The Summit Reached',
      paragraphs: [
        'The Knight folk rear up with a whinny. "You found the way through," their leader says.',
        '"Others could not follow. We respect that."',
        'The Knight joins your party.',
      ],
      nextTeaser: 'The Paired Path',
      nextTeaserEmoji: '🤝',
    },
    mapPos: { x: 0.82, y: 0.56 },
  },
  {
    id: 5,
    name: 'The Paired Path',
    emoji: '🤝',
    tagline: 'Two pieces. One journey.',
    palette: {
      bg: 'linear-gradient(to bottom, #fde68a, #fef3c7, #e0f2fe)',
      accent: '#b45309',
      nodeColor: '#f59e0b',
    },
    story: {
      title: 'Stronger Together',
      paragraphs: [
        'Moving together, each piece helped the other in a way neither could manage alone.',
        '"That is what friendship is," said the king. "Not doing everything for each other — just going together."',
        'The whole party cheers.',
      ],
      nextTeaser: "Queen's Realm",
      nextTeaserEmoji: '👑',
    },
    mapPos: { x: 0.88, y: 0.37 },
  },
  {
    id: 6,
    name: "Queen's Realm",
    emoji: '👑',
    tagline: 'The last and greatest challenge.',
    palette: {
      bg: 'linear-gradient(to bottom, #3b0764, #581c87, #1e1b4b)',
      accent: '#fbbf24',
      nodeColor: '#a855f7',
    },
    story: {
      title: 'The Borrowed Kingdom — Restored',
      paragraphs: [
        '"Your knight," she says quietly, "moves like no other. Not even I can watch all the corners at once."',
        'She stands. She bows — just slightly — and turns to face you.',
        '"I will join you. But know this: it was not power that reached me. It was understanding."',
      ],
    },
    mapPos: { x: 0.93, y: 0.18 },
  },
];

// ─── Unlock logic ─────────────────────────────────────────────────────────────

/**
 * Worlds 0 and 1 are always available. After that, completing world N unlocks N+1.
 */
export function getUnlockedWorlds(completedWorlds: number[]): number[] {
  const unlocked = new Set([0, 1]);
  for (const id of completedWorlds) {
    if (id + 1 < WORLDS.length) unlocked.add(id + 1);
  }
  return [...unlocked];
}

// ─── Progress storage ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'scm_adv_progress';

export type AdventureProgress = {
  completedWorlds: number[];
};

export function loadProgress(): AdventureProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completedWorlds: [] };
    return JSON.parse(raw) as AdventureProgress;
  } catch {
    return { completedWorlds: [] };
  }
}

export function saveProgress(progress: AdventureProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage errors
  }
}

export function markWorldComplete(worldId: number): AdventureProgress {
  const progress = loadProgress();
  if (!progress.completedWorlds.includes(worldId)) {
    progress.completedWorlds = [...progress.completedWorlds, worldId];
  }
  saveProgress(progress);
  return progress;
}

// ─── Level registries ─────────────────────────────────────────────────────────

/**
 * Maps world id → single-piece level array.
 * Populated by adventure/levels/index.ts.
 */
export const WORLD_LEVELS: Record<number, Level[]> = {};

/**
 * Maps world id → two-piece (duo) level array.
 * Populated by adventure/levels/index.ts.
 * A world ID present here is rendered by DuoWorldPlay, not WorldPlay.
 */
export const DUO_WORLD_LEVELS: Record<number, DuoLevel[]> = {};

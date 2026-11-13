// The always-open sneak modes on the home screen: tiptoe puzzles (green
// bubble) and walk the pawn home (blue bubble). Both use the sneak engine
// (src/core/sneak.ts), the same picker and the same play screen.

import type { ReactNode } from 'react';
import { PAWN_LEVELS, PAWN_RULES, PAWN_SKY } from '../content/pawnwalk.ts';
import { TIPTOE_LEVELS, TIPTOE_SKY } from '../content/tiptoe.ts';
import type { SneakRules } from '../core/sneak.ts';
import { FriendArt, GRUMPY } from './art.tsx';

export interface SneakLevel {
  id: string;
  grid: readonly string[];
  race?: boolean;
  /** Levels with the same set are shown together (tiptoe: sneak, shoo, safe). */
  set?: string;
}

/** The levels of a mode, split into its sets in order (one group when a mode has no sets). */
export function levelSets(levels: readonly SneakLevel[]): { set: string; levels: { level: SneakLevel; index: number }[] }[] {
  const out: { set: string; levels: { level: SneakLevel; index: number }[] }[] = [];
  levels.forEach((level, index) => {
    const name = level.set ?? '';
    const last = out[out.length - 1];
    if (last && last.set === name) last.levels.push({ level, index });
    else out.push({ set: name, levels: [{ level, index }] });
  });
  return out;
}

export interface SneakMode {
  /** URL path: #/tiptoe, #/pawn. */
  path: 'tiptoe' | 'pawn';
  /** Grown-up name, used for screen readers only. */
  name: string;
  levels: readonly SneakLevel[];
  rules: (l: SneakLevel) => Partial<SneakRules>;
  sky: string;
  hero: (className: string) => ReactNode;
}

export const TIPTOE_MODE: SneakMode = {
  path: 'tiptoe',
  name: 'Tiptoe puzzles',
  levels: TIPTOE_LEVELS,
  rules: () => ({}),
  sky: TIPTOE_SKY,
  hero: (className) => <FriendArt kind="rook" colors={GRUMPY} mood="sleepy" className={className} />,
};

export const PAWN_MODE: SneakMode = {
  path: 'pawn',
  name: 'Pawn walk puzzles',
  levels: PAWN_LEVELS,
  rules: PAWN_RULES,
  sky: PAWN_SKY,
  hero: (className) => <FriendArt kind="pawn" className={className} />,
};

export const SNEAK_MODES = { tiptoe: TIPTOE_MODE, pawn: PAWN_MODE } as const;

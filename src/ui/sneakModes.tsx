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

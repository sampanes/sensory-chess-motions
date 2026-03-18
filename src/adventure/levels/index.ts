/**
 * Barrel export for all world level arrays.
 * Also registers each world's levels in WORLD_LEVELS for WorldPlay lookup.
 */

import { WORLD_LEVELS, DUO_WORLD_LEVELS } from '../worlds';
import { act1KingLevels } from './king';
import { farmLevels } from './farm';
import { rookLevels } from './roads';
import { bishopLevels } from './grove';
import { knightLevels } from './mountains';
import { duoLevels } from './duo';
import { queenSoloLevels } from './queen';
import { frontierLevels } from './frontier';
import { shadowLevels } from './shadows';
import { revealLevels } from './reveal';
import { crownLevels } from './crown';
import { firstCheckLevels } from './firstcheck';
import { darkSectorLevels } from './darksector';

export { act1KingLevels } from './king';
export { farmLevels } from './farm';
export { rookLevels } from './roads';
export { bishopLevels } from './grove';
export { knightLevels } from './mountains';
export { duoLevels } from './duo';
export { queenSoloLevels, queenFinale } from './queen';
export { frontierLevels } from './frontier';
export { shadowLevels } from './shadows';
export { revealLevels } from './reveal';
export { crownLevels } from './crown';
export { firstCheckLevels } from './firstcheck';
export { darkSectorLevels } from './darksector';

// Register single-piece worlds
WORLD_LEVELS[0] = act1KingLevels;
WORLD_LEVELS[1] = farmLevels;
WORLD_LEVELS[2] = rookLevels;
WORLD_LEVELS[3] = bishopLevels;
WORLD_LEVELS[4] = knightLevels;
// World 6 solo queen levels (Q1-Q7). QueenWorldPlay handles the duo finale separately.
WORLD_LEVELS[6] = queenSoloLevels;
// World 7 — Starfield Frontier (piece selector + space theme)
WORLD_LEVELS[7] = frontierLevels;
// World 8 — The Shadow Pieces (captures)
WORLD_LEVELS[8] = shadowLevels;
// World 9 — The First Board (8×8 levels)
WORLD_LEVELS[9] = revealLevels;
// World 10 — The Pawn's Crown (promotion levels)
WORLD_LEVELS[10] = crownLevels;
// World 11 — The First Check (defender + attacker pairs)
WORLD_LEVELS[11] = firstCheckLevels;
// World 13 — The Dark Sector (patrol sentinels)
WORLD_LEVELS[13] = darkSectorLevels;

// Register two-piece worlds
DUO_WORLD_LEVELS[5] = duoLevels;

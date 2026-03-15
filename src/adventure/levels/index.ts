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

export { act1KingLevels } from './king';
export { farmLevels } from './farm';
export { rookLevels } from './roads';
export { bishopLevels } from './grove';
export { knightLevels } from './mountains';
export { duoLevels } from './duo';

// Register single-piece worlds
WORLD_LEVELS[0] = act1KingLevels;
WORLD_LEVELS[1] = farmLevels;
WORLD_LEVELS[2] = rookLevels;
WORLD_LEVELS[3] = bishopLevels;
WORLD_LEVELS[4] = knightLevels;

// Register two-piece worlds
DUO_WORLD_LEVELS[5] = duoLevels;

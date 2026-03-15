/**
 * Barrel export for all world level arrays.
 * Also registers each world's levels in WORLD_LEVELS for WorldPlay lookup.
 */

import { WORLD_LEVELS } from '../worlds';
import { act1KingLevels } from './king';
import { farmLevels } from './farm';
import { rookLevels } from './roads';
import { bishopLevels } from './grove';

export { act1KingLevels } from './king';
export { farmLevels } from './farm';
export { rookLevels } from './roads';
export { bishopLevels } from './grove';

// Register worlds
WORLD_LEVELS[0] = act1KingLevels;
WORLD_LEVELS[1] = farmLevels;
WORLD_LEVELS[2] = rookLevels;
WORLD_LEVELS[3] = bishopLevels;

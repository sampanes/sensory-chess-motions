/**
 * Barrel export for all world level arrays.
 * Also registers each world's levels in WORLD_LEVELS for WorldPlay lookup.
 */

import { WORLD_LEVELS } from '../worlds';
import { act1KingLevels } from './king';
import { farmLevels } from './farm';

export { act1KingLevels } from './king';
export { farmLevels } from './farm';

// Register worlds
WORLD_LEVELS[0] = act1KingLevels;
WORLD_LEVELS[1] = farmLevels;

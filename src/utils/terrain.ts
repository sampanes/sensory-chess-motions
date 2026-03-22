import { BlockKind, FoodKind } from '../types';

export function getFoodEmoji(kind?: FoodKind): string {
  switch (kind) {
    case 'broccoli':   return '🥦';
    case 'blueberry':  return '🫐';
    case 'strawberry': return '🍓';
    case 'carrot':     return '🥕';
    default:           return '🍎';
  }
}

/**
 * Background colour class for a blocking cell (non-bridge).
 * Tree and rock keep grass colours so the normal grass overlay still shows through.
 * Hole gets a sandy tan. River stays blue.
 */
export function getBlockBgClass(kind: BlockKind | undefined, r: number, c: number): string {
  switch (kind) {
    case 'tree':
    case 'rock': return (r + c) % 2 === 0 ? 'bg-emerald-200' : 'bg-emerald-400';
    case 'hole': return 'bg-amber-200';
    default:     return 'bg-blue-400'; // river
  }
}

/** Tree and rock sit on top of grass — the grass overlay should still render. */
export function isGrassBlock(kind?: BlockKind): boolean {
  return kind === 'tree' || kind === 'rock';
}

/** Whether a blocking cell should show the animated water overlay. */
export function isRiverKind(kind?: BlockKind): boolean {
  return !kind || kind === 'river';
}

/** Emoji overlaid on non-river block cells. */
export function getBlockEmoji(kind?: BlockKind): string {
  switch (kind) {
    case 'tree': return '🌲';
    case 'rock': return '🪨';
    case 'hole': return '🕳️';
    default:     return '';
  }
}

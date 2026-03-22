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

/** Background colour class for a blocking cell (non-bridge). */
export function getBlockBgClass(kind?: BlockKind): string {
  switch (kind) {
    case 'tree': return 'bg-emerald-800';
    case 'rock': return 'bg-stone-400';
    case 'hole': return 'bg-stone-900';
    default:     return 'bg-blue-400';
  }
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

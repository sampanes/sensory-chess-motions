// Today's puzzle, made once per day and kept, so the home screen and the play
// screen agree and the work is done at most once.

import { pickLook, type Look } from '../content/looks.ts';
import { WORLDS } from '../content/worlds.ts';
import { dailyPuzzle, dayKey, type DailyPuzzle } from '../core/daily.ts';
import { seededRandom } from '../core/generate.ts';
import { KIND_BY_CHAR } from '../core/puzzle.ts';
import type { Kind } from '../core/types.ts';

export const TODAY_SKY = '#fef9c3';

let cache: { day: string; puzzle: DailyPuzzle | null } | null = null;

export function todaysPuzzle(now = new Date()): DailyPuzzle | null {
  const day = dayKey(now);
  if (cache?.day !== day) cache = { day, puzzle: dailyPuzzle(now) };
  return cache.puzzle;
}

/** Saved-progress id for a day's puzzle. */
export const todayId = (now = new Date()) => `day-${dayKey(now)}`;

export interface Today {
  id: string;
  grid: readonly string[];
  faces: Kind[];
  look: Look;
}

/** Everything the screens need for today. A built-in level stands in if no puzzle was found. */
export function today(now = new Date()): Today {
  const daily = todaysPuzzle(now);
  const grid = daily?.grid ?? WORLDS[1].levels[6].grid;
  const faces = [...new Set(grid.join('').split('').flatMap((ch) => (KIND_BY_CHAR[ch] ? [KIND_BY_CHAR[ch]] : [])))];
  const look = pickLook({ treat: 'star', sky: TODAY_SKY }, true, seededRandom(daily?.seed ?? 1));
  return { id: todayId(now), grid, faces, look };
}

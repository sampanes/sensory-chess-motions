// Puzzle of the day: made from the date, so everyone gets the same one, and it
// needs no server. The friend changes with the day of the week (Sunday king,
// Monday rook, ... Saturday two friends at once). Every puzzle passes the
// generator's bar (src/core/generate.ts) and sits in a friendly middle range
// of difficulty; tests/daily.test.ts checks a whole year of dates.

import { judge, randomGrid, seededRandom, type Shape } from './generate.ts';
import type { Difficulty } from './difficulty.ts';
import type { Kind } from './types.ts';

const WEEK: readonly (Kind | 'friends')[] = ['king', 'rook', 'bishop', 'queen', 'knight', 'pawn', 'friends'];
const SINGLE: readonly Kind[] = ['king', 'rook', 'bishop', 'queen', 'knight'];
export const DAILY_SCORE = { min: 5, max: 14 } as const;
const MAX_TRIES = 4000;

/** Local calendar date as YYYY-MM-DD (the day a kid sees, not UTC). */
export function dayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export interface DailyPuzzle {
  day: string;
  grid: string[];
  difficulty: Difficulty;
  /** Seed for anything else that should be the same all day (treat, colors, music). */
  seed: number;
}

/** The puzzle for a date, or null in the (tested-away) case that none was found. */
export function dailyPuzzle(date: Date): DailyPuzzle | null {
  const day = dayKey(date);
  const seed = Number(day.replace(/-/g, ''));
  const rand = seededRandom(seed);
  const who = WEEK[date.getDay()];
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  for (let i = 0; i < MAX_TRIES; i++) {
    let kinds: Kind[] = [who as Kind];
    if (who === 'friends') {
      const a = SINGLE[int(0, SINGLE.length - 1)];
      const rest = SINGLE.filter((k) => k !== a);
      kinds = [a, rest[int(0, rest.length - 1)]];
    }
    const shape: Shape = { kinds, rows: int(3, 5), cols: int(3, 5), treats: int(2, 5), rocks: int(0, 3) };
    const grid = randomGrid(shape, rand);
    if (!grid) continue;
    const d = judge(grid);
    if (d && d.score >= DAILY_SCORE.min && d.score <= DAILY_SCORE.max) return { day, grid, difficulty: d, seed };
  }
  return null;
}

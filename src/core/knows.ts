// What they know (grown-up panel): for each friend, how many of its puzzles
// were finished without the hint hand. Nothing is uploaded; it is read from
// the progress saved on this device.
//
// The rule is deliberately simple so a parent can check it by eye: a friend
// counts as known once KNOWN_AFTER different puzzles of it were finished with
// no hint hand showing during that try.

import type { Progress } from './progress.ts';

/** This many puzzles finished without the hint hand means "knows it". */
export const KNOWN_AFTER = 5;

export type Knowing = 'not-yet' | 'learning' | 'knows';

export interface KnowReport {
  total: number;
  /** Puzzles finished at all. */
  done: number;
  /** Puzzles finished at least once without the hint hand. */
  own: number;
  knowing: Knowing;
}

export function knowReport(p: Progress, levelIds: readonly string[]): KnowReport {
  const done = levelIds.filter((id) => p.done.includes(id)).length;
  const own = levelIds.filter((id) => p.own.includes(id)).length;
  // A small set (fewer puzzles than the bar) is known when every one was done alone.
  const bar = Math.min(KNOWN_AFTER, levelIds.length);
  const knowing: Knowing = own >= bar && bar > 0 ? 'knows' : done > 0 || own > 0 ? 'learning' : 'not-yet';
  return { total: levelIds.length, done, own, knowing };
}

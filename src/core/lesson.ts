// The wordless first lesson: tap, hop, munch.
//
// The very first puzzle a kid ever plays is taught in three beats, each with
// exactly one thing to do:
//   tap   only the friend and its treat are on the board; a hand taps the friend
//   hop   the friend's spots light up; the hand taps the one with the treat
//   done  the friend hops and munches, and the game plays as usual
// A kid who already knows (taps a legal spot straight away) is never held up:
// the lesson only decides what is SHOWN, never what is allowed.

import type { Progress } from './progress.ts';

export type Lesson = 'tap' | 'hop' | 'done';

/** Only the first puzzle of the first world, and only while nothing at all has been finished. */
export function firstLesson(p: Progress, worldIndex: number, levelIndex: number): Lesson {
  return worldIndex === 0 && levelIndex === 0 && p.done.length === 0 ? 'tap' : 'done';
}

/** A press on a friend ends the "tap" beat. Any other press leaves the lesson where it is. */
export function lessonAfterPress(lesson: Lesson, onFriend: boolean): Lesson {
  return lesson === 'tap' && onFriend ? 'hop' : lesson;
}

/** The first hop ends the lesson, however the kid got there. */
export function lessonAfterHop(): Lesson {
  return 'done';
}

/** Hop spots stay hidden until the friend has been tapped. */
export function lessonShowsSpots(lesson: Lesson): boolean {
  return lesson !== 'tap';
}

/**
 * Where the hand points: at the friend who should move while the kid has not
 * tapped it yet (or when another friend is picked), otherwise at its next square.
 */
export function lessonHint(lesson: Lesson, selected: number, move: { friend: number; to: number }, friendAt: number): number {
  return lesson === 'tap' || move.friend !== selected ? friendAt : move.to;
}

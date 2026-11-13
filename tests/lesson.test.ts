// The wordless first lesson (tap, hop, munch) on the very first puzzle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstLesson, lessonAfterHop, lessonAfterPress, lessonHint, lessonShowsSpots } from '../src/core/lesson.ts';
import { emptyProgress, markDone } from '../src/core/progress.ts';

test('only the very first puzzle is a lesson, and only until anything is finished', () => {
  const fresh = emptyProgress();
  assert.equal(firstLesson(fresh, 0, 0), 'tap');
  assert.equal(firstLesson(fresh, 0, 1), 'done');
  assert.equal(firstLesson(fresh, 1, 0), 'done');
  // A kid who finished anything at all (even a daily puzzle) already knows how to play.
  assert.equal(firstLesson(markDone(fresh, 'king-1'), 0, 0), 'done');
  assert.equal(firstLesson(markDone(fresh, 'day-2026-11-12'), 0, 0), 'done');
  assert.equal(firstLesson(markDone(fresh, 'tiptoe-1'), 0, 0), 'done');
  // Bedtime puzzles are dragged from a tray, so a kid who only did those still gets the lesson.
  assert.equal(firstLesson(markDone(markDone(fresh, 'bed-1'), 'bed-2'), 0, 0), 'tap');
});

test('the beats go tap, hop, done', () => {
  assert.equal(lessonShowsSpots('tap'), false);
  // Tapping anything but a friend leaves the lesson where it is.
  assert.equal(lessonAfterPress('tap', false), 'tap');
  assert.equal(lessonAfterPress('tap', true), 'hop');
  assert.equal(lessonShowsSpots('hop'), true);
  assert.equal(lessonAfterPress('hop', true), 'hop');
  assert.equal(lessonAfterHop(), 'done');
  assert.equal(lessonAfterPress('done', true), 'done');
  assert.equal(lessonShowsSpots('done'), true);
});

test('the hand points at the friend first, then at its square', () => {
  const move = { friend: 0, to: 1 };
  assert.equal(lessonHint('tap', 0, move, 4), 4);
  assert.equal(lessonHint('hop', 0, move, 4), 1);
  assert.equal(lessonHint('done', 0, move, 4), 1);
  // Outside the lesson, another friend being picked still points at the friend who should move.
  assert.equal(lessonHint('done', 1, move, 4), 4);
});

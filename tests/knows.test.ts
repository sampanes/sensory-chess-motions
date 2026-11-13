// What they know: the grown-up panel's answer to "does my kid know how the knight moves?"
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KNOWN_AFTER, knowReport } from '../src/core/knows.ts';
import { emptyProgress, markFinished } from '../src/core/progress.ts';

const ids = Array.from({ length: 15 }, (_, i) => `knight-${i + 1}`);

test('nothing played is "not yet"', () => {
  assert.deepEqual(knowReport(emptyProgress(), ids), { total: 15, done: 0, own: 0, knowing: 'not-yet' });
});

test('finishing with the hint hand is "learning", however many', () => {
  let p = emptyProgress();
  for (const id of ids) p = markFinished(p, id, false);
  assert.deepEqual(knowReport(p, ids), { total: 15, done: 15, own: 0, knowing: 'learning' });
});

test('"knows it" takes KNOWN_AFTER different puzzles finished alone', () => {
  let p = emptyProgress();
  for (const id of ids.slice(0, KNOWN_AFTER - 1)) p = markFinished(p, id, true);
  assert.equal(knowReport(p, ids).knowing, 'learning');
  // The same puzzle again does not count twice.
  p = markFinished(p, ids[0], true);
  assert.equal(knowReport(p, ids).own, KNOWN_AFTER - 1);
  p = markFinished(p, ids[KNOWN_AFTER - 1], true);
  assert.deepEqual(knowReport(p, ids), { total: 15, done: KNOWN_AFTER, own: KNOWN_AFTER, knowing: 'knows' });
});

test('another friend\'s puzzles do not count', () => {
  let p = emptyProgress();
  for (let i = 1; i <= 8; i++) p = markFinished(p, `rook-${i}`, true);
  assert.equal(knowReport(p, ids).knowing, 'not-yet');
});

test('a set smaller than the bar is known when all of it was done alone', () => {
  const few = ['a', 'b', 'c'];
  let p = markFinished(markFinished(emptyProgress(), 'a', true), 'b', true);
  assert.equal(knowReport(p, few).knowing, 'learning');
  p = markFinished(p, 'c', true);
  assert.equal(knowReport(p, few).knowing, 'knows');
  assert.equal(knowReport(emptyProgress(), []).knowing, 'not-yet');
});

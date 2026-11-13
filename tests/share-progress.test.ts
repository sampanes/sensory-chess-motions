import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import {
  emptyProgress, isLevelOpen, isWorldOpen, loadProgress, markDone, markFinished, markWorldMet, needsFriendIntro,
  saveProgress, STORAGE_KEY,
  type KeyValueStore,
} from '../src/core/progress.ts';
import { toGrid } from '../src/core/puzzle.ts';
import { decodePuzzle, encodePuzzle } from '../src/core/share.ts';

test('share codes round-trip every built-in level', () => {
  for (const w of WORLDS) {
    for (const l of w.levels) {
      const code = encodePuzzle(l.grid);
      assert.match(code, /^[A-Za-z.-]+$/, 'code must be URL safe');
      const res = decodePuzzle(code);
      assert.ok(res.ok, l.id);
      if (res.ok) assert.deepEqual(toGrid(res.puzzle), [...l.grid]);
    }
  }
});

test('broken share codes are rejected, not crashed on', () => {
  for (const code of ['', 'zzz', '<script>', '---.---', 'K'.repeat(200), '-t-.-K-.--']) {
    assert.equal(decodePuzzle(code).ok, false, code);
  }
});

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

test('progress survives a save and load', () => {
  const store = memoryStore();
  const p = markWorldMet(markDone(markDone(emptyProgress(), 'king-1'), 'king-1'), 'king');
  assert.deepEqual(p.done, ['king-1']);
  assert.deepEqual(p.metWorlds, ['king']);
  saveProgress(store, { ...p, muted: true });
  assert.deepEqual(loadProgress(store), { done: ['king-1'], own: [], metWorlds: ['king'], unlockAll: false, muted: true });
});

test('garbage or missing storage falls back to a fresh start', () => {
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.deepEqual(loadProgress(memoryStore({ [STORAGE_KEY]: '{not json' })), emptyProgress());
  assert.deepEqual(loadProgress(memoryStore({
    [STORAGE_KEY]: '{"done":[1,"a"],"metWorlds":[false,"king"],"unlockAll":"yes"}',
  })), {
    done: ['a'], own: [], metWorlds: ['king'], unlockAll: false, muted: false,
  });
  const throwing: KeyValueStore = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadProgress(throwing), emptyProgress());
  assert.doesNotThrow(() => saveProgress(throwing, emptyProgress()));
});

test('a win without the hint hand is remembered, and survives a save and load', () => {
  const store = memoryStore();
  let p = markFinished(emptyProgress(), 'king-1', false);
  assert.deepEqual([p.done, p.own], [['king-1'], []]);
  // Played again later, this time alone: now it counts.
  p = markFinished(p, 'king-1', true);
  assert.deepEqual([p.done, p.own], [['king-1'], ['king-1']]);
  // A later win with the hand does not take it away, and nothing is listed twice.
  p = markFinished(markFinished(p, 'king-1', false), 'king-1', true);
  assert.deepEqual([p.done, p.own], [['king-1'], ['king-1']]);
  saveProgress(store, p);
  assert.deepEqual(loadProgress(store).own, ['king-1']);
  // Progress saved before this was counted loads with nothing known.
  assert.deepEqual(loadProgress(memoryStore({ [STORAGE_KEY]: '{"done":["king-1"]}' })).own, []);
});

test('friend intros are remembered and legacy completed worlds do not replay them', () => {
  const fresh = emptyProgress();
  assert.ok(needsFriendIntro(fresh, 'king', ['king-1', 'king-2']));

  const met = markWorldMet(markWorldMet(fresh, 'king'), 'king');
  assert.deepEqual(met.metWorlds, ['king']);
  assert.equal(markWorldMet(met, 'king'), met);
  assert.ok(!needsFriendIntro(met, 'king', ['king-1', 'king-2']));

  const legacy = markDone(fresh, 'king-1');
  assert.ok(!needsFriendIntro(legacy, 'king', ['king-1', 'king-2']));
  assert.ok(needsFriendIntro(legacy, 'rook', ['rook-1', 'rook-2']));
});

test('worlds open after half of the previous world, levels open in order', () => {
  const ids = [['a-1', 'a-2', 'a-3', 'a-4'], ['b-1', 'b-2'], ['c-1']];
  let p = emptyProgress();
  assert.ok(isWorldOpen(p, ids, 0));
  assert.ok(!isWorldOpen(p, ids, 1));
  assert.ok(isLevelOpen(p, ids, 0, 0));
  assert.ok(!isLevelOpen(p, ids, 0, 1));
  p = markDone(p, 'a-1');
  assert.ok(isLevelOpen(p, ids, 0, 1));
  assert.ok(!isWorldOpen(p, ids, 1));
  p = markDone(p, 'a-2');
  assert.ok(isWorldOpen(p, ids, 1));
  assert.ok(!isWorldOpen(p, ids, 2), 'needs the world before it too');
  p = markDone(p, 'b-1');
  assert.ok(isWorldOpen(p, ids, 2));
  assert.ok(isLevelOpen({ ...emptyProgress(), unlockAll: true }, ids, 2, 0));
});

test('a big world opens the next one after four levels, not half', () => {
  const big = Array.from({ length: 15 }, (_, i) => `a-${i + 1}`);
  const ids = [big, ['b-1']];
  let p = emptyProgress();
  for (const id of big.slice(0, 3)) p = markDone(p, id);
  assert.ok(!isWorldOpen(p, ids, 1));
  p = markDone(p, 'a-4');
  assert.ok(isWorldOpen(p, ids, 1));
});

test('a finished level stays open after the levels are reordered', () => {
  // a-3 was finished, then moved after a level that is not done yet.
  const ids = [['a-1', 'a-9', 'a-3']];
  const p = markDone(markDone(emptyProgress(), 'a-1'), 'a-3');
  assert.ok(isLevelOpen(p, ids, 0, 1), 'next after a done level');
  assert.ok(isLevelOpen(p, ids, 0, 2), 'done itself');
  assert.ok(!isLevelOpen(markDone(emptyProgress(), 'a-1'), ids, 0, 2));
});

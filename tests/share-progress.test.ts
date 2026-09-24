import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import {
  emptyProgress, isLevelOpen, isWorldOpen, loadProgress, markDone, saveProgress, STORAGE_KEY,
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
  const p = markDone(markDone(emptyProgress(), 'king-1'), 'king-1');
  assert.deepEqual(p.done, ['king-1']);
  saveProgress(store, { ...p, muted: true });
  assert.deepEqual(loadProgress(store), { done: ['king-1'], unlockAll: false, muted: true });
});

test('garbage or missing storage falls back to a fresh start', () => {
  assert.deepEqual(loadProgress(null), emptyProgress());
  assert.deepEqual(loadProgress(memoryStore({ [STORAGE_KEY]: '{not json' })), emptyProgress());
  assert.deepEqual(loadProgress(memoryStore({ [STORAGE_KEY]: '{"done":[1,"a"],"unlockAll":"yes"}' })), {
    done: ['a'], unlockAll: false, muted: false,
  });
  const throwing: KeyValueStore = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.deepEqual(loadProgress(throwing), emptyProgress());
  assert.doesNotThrow(() => saveProgress(throwing, emptyProgress()));
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

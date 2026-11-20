import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEDTIME_LEVELS } from '../src/content/bedtime.ts';
import { mustParseMate, parseMate, solveMate } from '../src/core/mate.ts';

const of = (set: string) => BEDTIME_LEVELS.filter((l) => l.set === set);
const solvable = (grid: readonly string[], tray: string) => {
  const res = parseMate(grid, tray);
  return res.ok && solveMate(res.puzzle, [], 1).length > 0;
};

test('bedtime has three sets of eight, in order, with stable ids', () => {
  assert.deepEqual(BEDTIME_LEVELS.map((l) => l.set), [...Array(8).fill('first'), ...Array(8).fill('helpers'), ...Array(8).fill('big')]);
  assert.equal(new Set(BEDTIME_LEVELS.map((l) => l.id)).size, BEDTIME_LEVELS.length);
  // Saved stars from before the sets keep pointing at the same puzzles.
  assert.deepEqual(of('first').map((l) => l.id), Array.from({ length: 8 }, (_, i) => `bed-${i + 1}`));
  // The first-run lesson skips bedtime ids by this prefix.
  for (const l of BEDTIME_LEVELS) assert.ok(l.id.startsWith('bed-'), l.id);
});

test('every friend in the tray is needed', () => {
  for (const l of BEDTIME_LEVELS) {
    for (let i = 0; i < l.tray.length && l.tray.length > 1; i++) {
      const less = l.tray.slice(0, i) + l.tray.slice(i + 1);
      assert.ok(!solvable(l.grid, less), `${l.id}: still solvable without tray friend ${l.tray[i]}`);
    }
  }
});

test('a helper puzzle has a friend on the board, and it is needed', () => {
  for (const l of of('helpers')) {
    const p = mustParseMate(l.grid, l.tray);
    assert.ok(p.fixed.length > 0, `${l.id} has no helper`);
    assert.equal(p.tray.length, 1, `${l.id}: one friend in the tray`);
    l.grid.forEach((row, r) => [...row].forEach((ch, c) => {
      if (!'KQRBNP'.includes(ch)) return;
      const without = l.grid.map((x, i) => (i === r ? x.slice(0, c) + '.' + x.slice(c + 1) : x));
      assert.ok(!solvable(without, l.tray), `${l.id}: the ${ch} helper is not needed`);
    }));
  }
});

test('big beds are 6x6 with at least two friends in the tray', () => {
  for (const l of of('big')) {
    assert.equal(l.grid.length, 6, l.id);
    assert.equal(l.grid[0].length, 6, l.id);
    assert.ok(l.tray.length >= 2, l.id);
  }
});

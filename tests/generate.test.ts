import assert from 'node:assert/strict';
import { test } from 'node:test';
import { judge, randomGrid, seededRandom, shapeKey } from '../src/core/generate.ts';
import { parseGrid } from '../src/core/puzzle.ts';

test('the same seed gives the same numbers', () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  const c = seededRandom(8);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});

test('random grids have the asked-for pieces and parse', () => {
  const rand = seededRandom(1);
  for (let i = 0; i < 200; i++) {
    const grid = randomGrid({ kinds: ['pawn', 'rook'], rows: 4, cols: 5, treats: 3, rocks: 2 }, rand);
    assert.ok(grid);
    const all = grid.join('');
    assert.equal(all.length, 20);
    assert.equal(all.split('*').length - 1, 3);
    assert.equal(all.split('#').length - 1, 2);
    assert.ok(!grid[0].includes('P') && !grid[1].includes('P'), 'no pawn on the top two rows');
    assert.ok(parseGrid(grid).ok);
  }
  assert.equal(randomGrid({ kinds: ['king'], rows: 3, cols: 3, treats: 9, rocks: 0 }, rand), null);
});

test('mirrors and turns of a puzzle share one key; pawns only mirror sideways', () => {
  const a = ['*..', '...', 'R.#'];
  assert.equal(shapeKey(a), shapeKey(['..*', '...', '#.R']));
  assert.equal(shapeKey(a), shapeKey(['R.#', '...', '*..']));
  assert.equal(shapeKey(a), shapeKey(['*.R', '...', '..#']));
  assert.notEqual(shapeKey(a), shapeKey(['*..', '...', '.R#']));
  const p = ['*..', '...', 'P..'];
  assert.equal(shapeKey(p), shapeKey(['..*', '...', '..P']));
  assert.notEqual(shapeKey(p), shapeKey(['P..', '...', '*..']));
});

test('the bar: kept puzzles have rocks that matter, needed friends, and no long walks', () => {
  // A rook going around a rock to two treats: every piece earns its place.
  assert.ok(judge(['*.#', '...', 'R.*']));
  // A rock that barely changes anything is clutter.
  assert.equal(judge(['*..', '..#', 'R.*']), null);
  // A king that walks two empty hops for one treat.
  assert.equal(judge(['..*', '.#.', 'K..']), null);
  // Two friends where the bishop is never needed.
  assert.equal(judge(['*..', '...', 'R.B']), null);
  // Cannot be finished at all.
  assert.equal(judge(['*..', '...', '.B.']), null);
  // A king's long walk across an empty board to one treat.
  assert.equal(judge(['*.....', '......', '......', '......', '......', '.....K']), null);
});

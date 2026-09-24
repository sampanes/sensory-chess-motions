import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS, findLevel } from '../src/content/worlds.ts';
import { parseGrid, startState } from '../src/core/puzzle.ts';
import { solve } from '../src/core/solver.ts';

// Tiny players: a level should never need more than this many hops.
const MAX_HOPS = 10;

const all = WORLDS.flatMap((w) => w.levels.map((l) => ({ w, l })));

test('every built-in level parses', () => {
  for (const { l } of all) {
    const res = parseGrid(l.grid);
    assert.ok(res.ok, `${l.id}: ${res.ok ? '' : res.error}`);
  }
});

test('every built-in level can be finished, and not too slowly', () => {
  for (const { l } of all) {
    const res = parseGrid(l.grid);
    if (!res.ok) continue;
    const solved = solve(res.puzzle, startState(res.puzzle));
    assert.equal(solved.status, 'solved', `${l.id} cannot be finished`);
    if (solved.status === 'solved') {
      assert.ok(solved.moves.length <= MAX_HOPS, `${l.id} needs ${solved.moves.length} hops`);
    }
  }
});

test('each world starts with a one-hop level so the new friend is easy to meet', () => {
  for (const w of WORLDS) {
    const res = parseGrid(w.levels[0].grid);
    assert.ok(res.ok);
    if (!res.ok) continue;
    const solved = solve(res.puzzle, startState(res.puzzle));
    assert.ok(solved.status === 'solved' && solved.moves.length <= 2, `${w.id} first level is too hard`);
  }
});

test('single-friend worlds only use their own friend', () => {
  for (const w of WORLDS.filter((x) => x.id !== 'friends')) {
    for (const l of w.levels) {
      const res = parseGrid(l.grid);
      assert.ok(res.ok);
      if (!res.ok) continue;
      assert.deepEqual(res.puzzle.friends.map((f) => f.kind), [w.id], l.id);
    }
  }
});

test('the friends world always has more than one friend', () => {
  const w = WORLDS.find((x) => x.id === 'friends')!;
  for (const l of w.levels) {
    const res = parseGrid(l.grid);
    assert.ok(res.ok && res.puzzle.friends.length >= 2, l.id);
  }
});

test('level ids are unique and look-up works', () => {
  const ids = all.map(({ l }) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const { w, l } of all) assert.equal(findLevel(l.id)?.world.id, w.id);
  assert.equal(findLevel('nope-1'), null);
});

test('no two levels are the same puzzle', () => {
  const grids = all.map(({ l }) => l.grid.join('/'));
  assert.equal(new Set(grids).size, grids.length);
});

test('every world has a few levels', () => {
  for (const w of WORLDS) assert.ok(w.levels.length >= 5, w.id);
});

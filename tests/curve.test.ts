import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty } from '../src/core/difficulty.ts';
import { mustParse } from '../src/core/puzzle.ts';

// The climb inside a world: never easier than the level before, and never a
// jump bigger than this many score points. `node scripts/sort-levels.ts` fixes
// the order; `node scripts/generate.ts <world>` fills a gap that is too wide.
const MAX_STEP = 4;
const LEVELS_PER_WORLD = 15;

const scored = WORLDS.map((w) => ({
  w,
  levels: w.levels.map((l) => ({ id: l.id, score: rateDifficulty(mustParse(l.grid))?.score ?? NaN })),
}));

test('every level can be rated', () => {
  for (const { levels } of scored) for (const l of levels) assert.ok(!Number.isNaN(l.score), l.id);
});

test('each world gets harder in order, and only gently', () => {
  for (const { levels } of scored) {
    for (let i = 1; i < levels.length; i++) {
      const [a, b] = [levels[i - 1], levels[i]];
      assert.ok(b.score >= a.score, `${b.id} (${b.score}) is easier than ${a.id} (${a.score}) before it`);
      assert.ok(b.score - a.score <= MAX_STEP, `${a.id} (${a.score}) to ${b.id} (${b.score}) is too big a jump`);
    }
  }
});

test(`every world has at least ${LEVELS_PER_WORLD} levels`, () => {
  for (const { w } of scored) assert.ok(w.levels.length >= LEVELS_PER_WORLD, `${w.id} has ${w.levels.length}`);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty } from '../src/core/difficulty.ts';
import { mustParse, startState } from '../src/core/puzzle.ts';
import { solve } from '../src/core/solver.ts';

test('a fifty-fifty first hop costs one bit', () => {
  // The rook can stop below the treat or eat it: one good hop out of two.
  const d = rateDifficulty(mustParse(['*##', '.##', 'R##']));
  assert.deepEqual(d, { moves: 1, guessBits: 1, deadEnds: 0, positions: 3, score: 2 });
});

test('hops into dead ends count as wrong, and dead ends are counted', () => {
  // Same pawn as the solver test: each step has one good hop and one that
  // strands the pawn. Positions: start, two stranded, one halfway, won.
  const d = rateDifficulty(mustParse(['.#..', '*.#.', '.*..', '..P.']));
  assert.deepEqual(d, { moves: 2, guessBits: 2, deadEnds: 0.4, positions: 5, score: 4 });
});

test('several shortest routes are all counted as good', () => {
  // Rook: 1 good hop of 4 (up to the middle of the top row). Then it may eat
  // either treat first: 2 good of 4, and each of those leaves 1 good of 2.
  // Chance = 1/4 * (1/2 + 1/2) / 4 = 1/16, so 4 bits. Counting only one
  // route would give 1/32, 5 bits.
  const d = rateDifficulty(mustParse(['*.*', '#.#', '.R.']))!;
  assert.equal(d.moves, 3);
  assert.equal(d.guessBits, 4);
});

test('a puzzle that cannot be finished gets no rating', () => {
  assert.equal(rateDifficulty(mustParse(['.*.', '...', 'B..'])), null);
});

test('every built-in level is rated, and its moves match the solver', () => {
  for (const w of WORLDS) {
    for (const l of w.levels) {
      const p = mustParse(l.grid);
      const d = rateDifficulty(p);
      assert.ok(d, `${l.id} has no rating`);
      const res = solve(p, startState(p));
      assert.ok(res.status === 'solved' && res.moves.length === d.moves, `${l.id}: rating and solver disagree`);
      assert.ok(d.score >= d.moves, `${l.id}: score below moves`);
    }
  }
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mustParse, startState } from '../src/core/puzzle.ts';
import { applyMove, isWon } from '../src/core/rules.ts';
import { solve } from '../src/core/solver.ts';

test('finds the shortest solution and it actually wins', () => {
  const p = mustParse(['*...*', '.....', '..R..', '.....', '*...*']);
  const res = solve(p, startState(p));
  assert.equal(res.status, 'solved');
  if (res.status !== 'solved') return;
  let s = startState(p);
  for (const m of res.moves) {
    const next = applyMove(p, s, m);
    assert.ok(next, 'solver produced an illegal move');
    s = next.state;
  }
  assert.ok(isWon(s));
  assert.equal(res.moves.length, 5);
});

test('an already-won state needs no moves', () => {
  const p = mustParse(['*..', '.K.', '...']);
  assert.deepEqual(solve(p, { ...startState(p), left: 0 }), { status: 'solved', moves: [] });
});

test('detects a pawn that walked past its treats', () => {
  // Right: eat (2,1) then (1,0). Wrong: step up to (2,2) -- the rock at (1,2)
  // now blocks the pawn and no treat is diagonal to it, so it is stuck.
  const p = mustParse(['.#..', '*.#.', '.*..', '..P.']);
  const s = startState(p);
  const solved = solve(p, s);
  assert.equal(solved.status, 'solved');
  if (solved.status === 'solved') assert.equal(solved.moves.length, 2);
  const wrong = applyMove(p, s, { friend: 0, to: 2 * 4 + 2 })!;
  assert.equal(solve(p, wrong.state).status, 'stuck');
});

test('reports stuck when a treat can never be reached', () => {
  // Bishop on a light square can never reach a dark square.
  const p = mustParse(['.*.', '...', 'B..']);
  assert.equal(solve(p, startState(p)).status, 'stuck');
});

test('reports too-big instead of hanging when the search explodes', () => {
  const p = mustParse(['*....*', '......', '......', '......', '......', 'QRB..*']);
  assert.equal(solve(p, startState(p), 10).status, 'too-big');
});

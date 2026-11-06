import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dailyPuzzle, dayKey, DAILY_SCORE } from '../src/core/daily.ts';
import { MAX_MOVES } from '../src/core/generate.ts';
import { parseGrid, startState } from '../src/core/puzzle.ts';
import { solve } from '../src/core/solver.ts';

const WEEK = ['king', 'rook', 'bishop', 'queen', 'knight', 'pawn'];

test('dates are the local calendar day', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31, 0, 1)), '2026-12-31');
});

test('the same day always gives the same puzzle', () => {
  const a = dailyPuzzle(new Date(2026, 10, 7, 8));
  const b = dailyPuzzle(new Date(2026, 10, 7, 20));
  assert.ok(a && b);
  assert.deepEqual(a.grid, b.grid);
  assert.notDeepEqual(a.grid, dailyPuzzle(new Date(2026, 10, 8))?.grid);
});

test('365 days in a row each get a finishable puzzle with the right friends', () => {
  for (let i = 0; i < 365; i++) {
    const date = new Date(2026, 10, 7 + i);
    const p = dailyPuzzle(date);
    assert.ok(p, `no puzzle for ${dayKey(date)}`);
    const res = parseGrid(p.grid);
    assert.ok(res.ok, p.day);
    const solved = solve(res.puzzle, startState(res.puzzle));
    assert.ok(solved.status === 'solved' && solved.moves.length <= MAX_MOVES, p.day);
    assert.ok(p.difficulty.score >= DAILY_SCORE.min && p.difficulty.score <= DAILY_SCORE.max, p.day);
    const kinds = res.puzzle.friends.map((f) => f.kind);
    const day = date.getDay();
    if (day < 6) assert.deepEqual(kinds, [WEEK[day]], p.day);
    else assert.equal(new Set(kinds).size, 2, p.day);
  }
});

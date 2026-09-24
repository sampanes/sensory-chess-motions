import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mustParse, parseGrid, startState, toGrid } from '../src/core/puzzle.ts';
import { applyMove, hopsFor, isWon } from '../src/core/rules.ts';
import type { Puzzle } from '../src/core/types.ts';

// Helpers: address squares as [row, col] for readable tests.
const at = (p: Puzzle, r: number, c: number) => r * p.cols + c;
const hops = (grid: string[], fi = 0) => {
  const p = mustParse(grid);
  return hopsFor(p, startState(p), fi)
    .map((pos) => `${Math.floor(pos / p.cols)},${pos % p.cols}`)
    .sort();
};

test('king steps one square in all 8 directions', () => {
  assert.equal(hops(['*....', '.....', '..K..', '.....', '.....']).length, 8);
  assert.deepEqual(hops(['K*', '..', '..'].map((r) => r + '.')), ['0,1', '1,0', '1,1']);
});

test('king cannot step onto rocks', () => {
  assert.deepEqual(hops(['.#*', '#K#', '.#.']), ['0,0', '0,2', '2,0', '2,2']);
});

test('rook slides straight and is stopped by rocks', () => {
  assert.deepEqual(hops(['*...', '.#..', '....', 'R#..']), ['0,0', '1,0', '2,0']);
});

test('rook stops on a treat instead of sliding past it', () => {
  const got = hops(['R*.*', '....', '....']);
  assert.deepEqual(got, ['0,1', '1,0', '2,0']);
});

test('bishop slides diagonally only', () => {
  assert.deepEqual(hops(['*..', '.B.', '...']), ['0,0', '0,2', '2,0', '2,2']);
});

test('queen combines rook and bishop', () => {
  assert.equal(hops(['*....', '.....', '..Q..', '.....', '.....']).length, 16);
});

test('knight jumps in an L and ignores rocks in between', () => {
  assert.deepEqual(hops(['.*...', '.###.', '.#N#.', '.###.', '.....']), [
    '0,1', '0,3', '1,0', '1,4', '3,0', '3,4', '4,1', '4,3',
  ]);
});

test('pawn steps up onto grass but not onto a treat straight ahead', () => {
  assert.deepEqual(hops(['...', '.P.', '*..']), ['0,1']);
  assert.deepEqual(hops(['...', '.*.', '.P.']), []);
});

test('pawn eats diagonally up only when a treat is there', () => {
  assert.deepEqual(hops(['...', '*..', '.P.']), ['1,0', '1,1']);
});

test('pawn becomes a queen on the top row', () => {
  const p = mustParse(['*.*', '...', '.P.']);
  let s = startState(p);
  s = applyMove(p, s, { friend: 0, to: at(p, 1, 1) })!.state;
  const res = applyMove(p, s, { friend: 0, to: at(p, 0, 0) })!;
  assert.equal(res.promoted, true);
  assert.equal(res.state.friends[0].kind, 'queen');
  // As a queen it can now slide sideways to the last treat.
  assert.ok(hopsFor(p, res.state, 0).includes(at(p, 0, 2)));
});

test('friends block each other', () => {
  assert.deepEqual(hops(['*..', 'R..', 'B..'], 0), ['0,0', '1,1', '1,2']);
});

test('eating every treat wins', () => {
  const p = mustParse(['*..', '.K.', '...']);
  const res = applyMove(p, startState(p), { friend: 0, to: at(p, 0, 0) })!;
  assert.equal(res.ate, 0);
  assert.ok(isWon(res.state));
});

test('illegal moves are refused', () => {
  const p = mustParse(['*..', '.K.', '...']);
  assert.equal(applyMove(p, startState(p), { friend: 0, to: at(p, 1, 1) }), null);
  assert.equal(applyMove(p, startState(p), { friend: 3, to: at(p, 0, 0) }), null);
});

test('parser rejects broken grids with a readable reason', () => {
  const bad: [string[], RegExp][] = [
    [['..', '..'], /rows/],
    [['...', '..', '...'], /Row 2/],
    [['.*.', '...', '...'], /friend/],
    [['.K.', '...', '...'], /treat/],
    [['.P.', '*..', '...'], /top row/],
    [['.Z.', '*..', '...'], /Unknown/],
    [['KKK', 'K**', '...'], /friends/],
  ];
  for (const [grid, why] of bad) {
    const res = parseGrid(grid);
    assert.equal(res.ok, false, grid.join('/'));
    if (!res.ok) assert.match(res.error, why);
  }
});

test('toGrid is the inverse of parseGrid', () => {
  const grid = ['*.#', '.K.', 'P.*'];
  assert.deepEqual(toGrid(mustParse(grid)), grid);
});

// Grown-up tools behind the puzzle maker: sets of puzzles in one link, and "make it a bit harder".
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty } from '../src/core/difficulty.ts';
import { MAX_MOVES } from '../src/core/generate.ts';
import { makeHarder } from '../src/core/harder.ts';
import { mustParse, toGrid } from '../src/core/puzzle.ts';
import { decodeSet, encodePuzzle, encodeSet, joinSet, SET_MAX } from '../src/core/share.ts';

test('a set of puzzles round-trips through one link code, in order', () => {
  const grids = [WORLDS[0].levels[0].grid, WORLDS[1].levels[4].grid, WORLDS[4].levels[9].grid];
  const code = encodeSet(grids);
  assert.match(code, /^[A-Za-z._-]+$/, 'code must be URL safe');
  assert.equal(code, joinSet(grids.map(encodePuzzle)));
  const res = decodeSet(code);
  assert.ok(res.ok);
  if (res.ok) assert.deepEqual(res.puzzles.map(toGrid), grids.map((g) => [...g]));
});

test('one puzzle is a set of one, so old share links still open', () => {
  const grid = WORLDS[2].levels[3].grid;
  const res = decodeSet(encodePuzzle(grid));
  assert.ok(res.ok && res.puzzles.length === 1);
  if (res.ok) assert.deepEqual(toGrid(res.puzzles[0]), [...grid]);
});

test('a set with a broken puzzle, or too many, is refused whole', () => {
  const good = encodePuzzle(WORLDS[0].levels[0].grid);
  assert.equal(decodeSet(`${good}_zzz`).ok, false);
  assert.equal(decodeSet(`${good}__${good}`).ok, false, 'an empty puzzle in the middle');
  assert.equal(decodeSet('').ok, false);
  assert.equal(decodeSet(Array(SET_MAX).fill(good).join('_')).ok, true);
  assert.equal(decodeSet(Array(SET_MAX + 1).fill(good).join('_')).ok, false);
  const broken = decodeSet(`${good}_${good}_K`);
  assert.ok(!broken.ok && /Puzzle 3/.test(broken.error), 'says which one');
});

test('"make it a bit harder" changes one empty square and the puzzle stays finishable', () => {
  const samples = [
    ['.....', '..*..', '.....', '.....', '..R..'],
    WORLDS[0].levels[2].grid,
    WORLDS[1].levels[6].grid,
    WORLDS[2].levels[5].grid,
    WORLDS[4].levels[4].grid,
    WORLDS[6].levels[3].grid,
  ];
  for (const grid of samples) {
    const res = makeHarder(grid);
    assert.ok(res && res !== 'too-big', grid.join('/'));
    const changed: string[] = [];
    grid.forEach((line, r) => [...line].forEach((ch, c) => { if (res.grid[r][c] !== ch) changed.push(`${ch}>${res.grid[r][c]}`); }));
    assert.deepEqual(changed, [`.>${res.added}`], 'exactly one empty square was filled');
    assert.equal(res.grid[res.row][res.col], res.added);
    const after = rateDifficulty(mustParse(res.grid));
    assert.ok(after, 'still finishable');
    assert.deepEqual(after, res.after);
    assert.ok(res.after.score >= res.before.score + 0.5, 'noticeably harder');
    assert.ok(res.after.moves <= MAX_MOVES, 'not a monster');
  }
});

test('pressing it again and again climbs gently, then says so when nothing small is left', () => {
  let grid: readonly string[] = ['...', '.*.', '...', '.K.'];
  let last = rateDifficulty(mustParse(grid))!.score;
  let steps = 0;
  for (; steps < 40; steps++) {
    const res = makeHarder(grid);
    if (!res || res === 'too-big') break;
    assert.ok(res.after.score > last);
    last = res.after.score;
    grid = res.grid;
  }
  assert.ok(steps >= 3, `only ${steps} steps`);
  assert.ok(steps < 40, 'it stops by itself');
  assert.equal(makeHarder(grid), null);
});

test('a puzzle that cannot be finished gets no suggestion', () => {
  assert.equal(makeHarder(['*#.', '##.', '..K']), null);
  assert.equal(makeHarder(['...', '...', '...']), null, 'no friend, no treat');
});

test('a puzzle too big to rate says so, instead of "nothing makes it harder"', () => {
  // Two rooks and five treats on a 6x6: finishable in 6 moves, but far too many positions to map.
  const big = ['*....*', '......', '..*...', '......', '*....*', 'R....R'];
  assert.equal(makeHarder(big), 'too-big');
});

test('with a time budget it stops early and still gives the best change found so far', () => {
  const grid = ['.....', '..*..', '.....', '.....', '..R..'];
  const exact = makeHarder(grid);
  assert.ok(exact && exact !== 'too-big');
  // A clock that jumps a second every time it is read: the budget is gone after the first square.
  let t = 0;
  const hurried = makeHarder(grid, 500, () => (t += 1000));
  // Nothing was found before the time ran out, which is "could not work it out", not "nothing exists".
  assert.equal(hurried, 'too-big');
  // A generous budget gives the exact answer.
  assert.deepEqual(makeHarder(grid, 60_000), exact);
  // Out of time after a few squares: whatever it returns is a real, finishable, harder puzzle.
  let n = 0;
  const partial = makeHarder(grid, 5, () => (n++ < 6 ? 0 : 1000));
  assert.ok(partial && partial !== 'too-big');
  assert.ok(partial.after.score >= partial.before.score + 0.5);
});

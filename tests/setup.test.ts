// The real board: starting squares and the move pictures on the grown-up card.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SETUP_LEVELS } from '../src/content/setup.ts';
import {
  BACK_RANK, BOARD, farStartingSquares, isLightSquare, makeSetup, moveDiagram, setupDrop, setupStart, setupTargets,
  setupWon, startingSquares,
} from '../src/core/setup.ts';
import { KINDS } from '../src/core/types.ts';

const sq = (row: number, col: number) => row * BOARD + col;

test('a real board has a light square in each player\'s right-hand corner', () => {
  assert.ok(isLightSquare(sq(7, 7)), 'bottom right, for the near player');
  assert.ok(isLightSquare(sq(0, 0)), 'top left, which is the far player\'s right');
  assert.ok(!isLightSquare(sq(7, 0)), 'the near left corner is dark');
});

test('the near side starts with sixteen pieces on its two rows', () => {
  const start = startingSquares();
  assert.equal(start.length, 16);
  assert.equal(new Set(start.map((p) => p.at)).size, 16, 'one piece per square');
  const at = (pos: number) => start.find((p) => p.at === pos)?.kind;
  for (let c = 0; c < BOARD; c++) assert.equal(at(sq(6, c)), 'pawn');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((c) => at(sq(7, c))), [...BACK_RANK]);
  assert.deepEqual([at(sq(7, 0)), at(sq(7, 7))], ['rook', 'rook'], 'rooks in the corners');
  assert.deepEqual([at(sq(7, 1)), at(sq(7, 6))], ['knight', 'knight']);
  assert.deepEqual([at(sq(7, 2)), at(sq(7, 5))], ['bishop', 'bishop']);
  // The near (light) queen stands on a light square, the king beside her on a dark one.
  assert.equal(at(sq(7, 3)), 'queen');
  assert.ok(isLightSquare(sq(7, 3)));
  assert.equal(at(sq(7, 4)), 'king');
  assert.ok(!isLightSquare(sq(7, 4)));
});

test('the far side mirrors it: queens face each other, and the far queen is on a dark square', () => {
  const far = farStartingSquares();
  const at = (pos: number) => far.find((p) => p.at === pos)?.kind;
  for (let c = 0; c < BOARD; c++) assert.equal(at(sq(1, c)), 'pawn');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map((c) => at(sq(0, c))), [...BACK_RANK]);
  assert.equal(at(sq(0, 3)), 'queen');
  assert.ok(!isLightSquare(sq(0, 3)), 'the dark queen on a dark square');
  const near = new Set(startingSquares().map((p) => p.at));
  assert.ok(far.every((p) => !near.has(p.at)));
});

test('the move pictures come from the real rules', () => {
  const rc = (pos: number) => [Math.floor(pos / 5), pos % 5] as const;
  const from = (kind: (typeof KINDS)[number]) => {
    const d = moveDiagram(kind);
    const [r0, c0] = rc(d.at);
    return { d, steps: d.moves.map((m) => [rc(m)[0] - r0, rc(m)[1] - c0] as const) };
  };
  for (const kind of KINDS) assert.equal(moveDiagram(kind).size, 5);

  const king = from('king');
  assert.equal(king.steps.length, 8);
  assert.ok(king.steps.every(([dr, dc]) => Math.max(Math.abs(dr), Math.abs(dc)) === 1));

  const rook = from('rook');
  assert.equal(rook.steps.length, 8);
  assert.ok(rook.steps.every(([dr, dc]) => dr === 0 || dc === 0));

  const bishop = from('bishop');
  assert.equal(bishop.steps.length, 8);
  assert.ok(bishop.steps.every(([dr, dc]) => Math.abs(dr) === Math.abs(dc)));
  assert.ok(bishop.d.moves.every((m) => isLightSquare(m, 5) === isLightSquare(bishop.d.at, 5)), 'one color forever');

  assert.equal(from('queen').steps.length, 16);

  const knight = from('knight');
  assert.equal(knight.steps.length, 8);
  assert.ok(knight.steps.every(([dr, dc]) => Math.abs(dr) * Math.abs(dc) === 2));

  const pawn = from('pawn');
  assert.deepEqual(pawn.steps, [[-1, 0]], 'one step straight ahead');
  assert.deepEqual(pawn.d.captures.map((m) => [rc(m)[0] - rc(pawn.d.at)[0], rc(m)[1] - rc(pawn.d.at)[1]]), [[-1, -1], [-1, 1]]);
  for (const kind of KINDS) if (kind !== 'pawn') assert.deepEqual(moveDiagram(kind).captures, []);
});

// ---- Set up the board (lab prototype) ---------------------------------------

test('friends start scattered on the four middle rows, one per square, the same way every time', () => {
  for (const [li, level] of SETUP_LEVELS.entries()) {
    const p = makeSetup(level, li + 1);
    const want = startingSquares().filter((q) => level.place.includes(q.kind)).length;
    assert.equal(p.loose.length, want, level.id);
    assert.equal(new Set(p.loose.map((f) => f.at)).size, want, `${level.id}: two friends on one square`);
    for (const f of p.loose) {
      const row = Math.floor(f.at / BOARD);
      assert.ok(row >= 2 && row <= 5, `${level.id}: a friend starts on row ${row}`);
    }
    assert.deepEqual(makeSetup(level, li + 1), p, 'same seed, same scatter');
    assert.equal(p.model.length, 16, 'the far side is the picture to copy');
    assert.equal(p.fixed.length, startingSquares().filter((q) => level.standing.includes(q.kind)).length);
  }
});

test('a rook goes home on either corner, hops back from a wrong home square, and ignores the middle', () => {
  const p = makeSetup({ place: ['rook'], standing: [] });
  const s = setupStart(p);
  assert.deepEqual(setupTargets(p, s, 0).sort((a, b) => a - b), [sq(7, 0), sq(7, 7)]);
  assert.equal(setupDrop(p, s, 0, sq(7, 3)).kind, 'wrong', 'the queen\'s square');
  assert.equal(setupDrop(p, s, 0, sq(6, 0)).kind, 'wrong', 'a pawn\'s square');
  assert.equal(setupDrop(p, s, 0, sq(4, 4)).kind, 'no', 'a middle square');
  assert.equal(setupDrop(p, s, 0, sq(0, 0)).kind, 'no', 'the far side\'s corner');
  const home = setupDrop(p, s, 0, sq(7, 7));
  assert.equal(home.kind, 'home');
  if (home.kind !== 'home') return;
  assert.ok(!setupWon(home.state));
  // The second rook cannot share that corner, and a friend at home stays put.
  assert.deepEqual(setupTargets(p, home.state, 1), [sq(7, 0)]);
  assert.equal(setupDrop(p, home.state, 1, sq(7, 7)).kind, 'wrong');
  assert.equal(setupDrop(p, home.state, 0, sq(7, 0)).kind, 'no');
  const done = setupDrop(p, home.state, 1, sq(7, 0));
  assert.ok(done.kind === 'home' && setupWon(done.state));
});

test('the queen has exactly one square, of her own color', () => {
  const p = makeSetup(SETUP_LEVELS[3]);
  const s = setupStart(p);
  const queen = p.loose.findIndex((f) => f.kind === 'queen');
  const king = p.loose.findIndex((f) => f.kind === 'king');
  assert.deepEqual(setupTargets(p, s, queen), [sq(7, 3)]);
  assert.deepEqual(setupTargets(p, s, king), [sq(7, 4)]);
  assert.equal(setupDrop(p, s, queen, sq(7, 4)).kind, 'wrong', 'the king\'s square');
});

test('every level can be finished, and ends as the real starting position', () => {
  for (const [li, level] of SETUP_LEVELS.entries()) {
    const p = makeSetup(level, li + 1);
    let s = setupStart(p);
    p.loose.forEach((_, fi) => {
      const res = setupDrop(p, s, fi, setupTargets(p, s, fi)[0]);
      assert.equal(res.kind, 'home', level.id);
      if (res.kind === 'home') s = res.state;
    });
    assert.ok(setupWon(s), level.id);
    const final = [...p.fixed, ...p.loose.map((f, i) => ({ kind: f.kind, at: s.at[i] }))];
    const real = new Map(startingSquares().map((q) => [q.at, q.kind]));
    for (const f of final) assert.equal(real.get(f.at), f.kind, `${level.id}: a ${f.kind} ended on ${f.at}`);
  }
  // The last level is the whole side.
  const last = SETUP_LEVELS[SETUP_LEVELS.length - 1];
  assert.equal(makeSetup(last).loose.length, 16);
  assert.equal(new Set(SETUP_LEVELS.map((l) => l.id)).size, SETUP_LEVELS.length);
});

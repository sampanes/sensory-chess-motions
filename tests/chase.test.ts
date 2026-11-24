import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOSS_LEVELS } from '../src/content/bosses.ts';
import { CHASE_LEVELS } from '../src/content/chase.ts';
import { WORLDS } from '../src/content/worlds.ts';
import {
  bestMove, eatenBy, friendMoves, movesToWin, moveFriend, mustParseChase, NEVER, parseChase, slimeChoice, slimeSteps,
  solveChase, statusOf, type ChasePuzzle, type ChaseState,
} from '../src/core/chase.ts';
import { mustParseMate, solveMate } from '../src/core/mate.ts';
import { KIND_BY_CHAR } from '../src/core/puzzle.ts';

const at = (pz: ChasePuzzle, r: number, c: number) => r * pz.cols + c;

test('a start where the slime is already watched, or the kings touch, is refused', () => {
  assert.equal(parseChase(['k....', '.....', '..Q..', '.....', '..K..']).ok, false); // queen on its diagonal
  assert.equal(parseChase(['.k...', '..K..', '.....', '.....', 'Q....']).ok, false);
  assert.equal(parseChase(['.k...', '.....', '...P.', '.....', '.....']).ok, false); // pawns do not chase
});

test('friends move along their own lines, stopped by rocks, friends and the slime', () => {
  const pz = mustParseChase(['..k..', '.....', '..K..', '.....', 'Q.#..']);
  const queen = friendMoves(pz, pz.start, 1);
  assert.ok(queen.includes(at(pz, 0, 0)), 'up the side');
  assert.ok(queen.includes(at(pz, 4, 1)) && !queen.includes(at(pz, 4, 2)) && !queen.includes(at(pz, 4, 3)), 'the rock stops it');
  assert.ok(queen.includes(at(pz, 2, 2)) === false, 'not onto the king');
  const king = friendMoves(pz, pz.start, 0);
  assert.ok(!king.includes(at(pz, 1, 2)) && !king.includes(at(pz, 1, 1)), 'your king never steps next to the slime');
  assert.ok(king.includes(at(pz, 3, 2)));
});

test('the slime steps only to squares nobody watches, and eats a lonely friend', () => {
  const pz = mustParseChase(['..k..', '.....', '..K..', '.....', 'Q....']);
  // Queen to the square in front of the slime, protected by the king: checkmate.
  const mated = moveFriend(pz.start, 1, at(pz, 1, 2));
  assert.equal(statusOf(pz, mated), 'mate');
  assert.deepEqual(slimeSteps(pz, mated), []);
  // Queen next to the slime with nobody protecting it: the slime eats it.
  const lonely = mustParseChase(['..k..', '.....', '.....', 'K....', '....Q']);
  const s = moveFriend(lonely.start, 1, at(lonely, 0, 3));
  const t = solveChase(lonely);
  const step = slimeChoice(lonely, t, s);
  assert.equal(step, at(lonely, 0, 3));
  assert.equal(eatenBy(s, step!), 1);
});

test('every chase level can be won against the slime at its best, in the moves it says', () => {
  const ids = new Set<string>();
  let last = 0;
  for (const level of CHASE_LEVELS) {
    assert.ok(!ids.has(level.id), `duplicate id ${level.id}`);
    ids.add(level.id);
    const pz = mustParseChase(level.grid);
    const t = solveChase(pz);
    assert.equal(movesToWin(pz, t, pz.start), level.moves, `${level.id}: quickest win`);
    assert.ok(level.moves >= last, `${level.id}: the climb never gets easier`);
    last = level.moves;
  }
});

test('following the hint wins, whatever the slime does', () => {
  for (const level of CHASE_LEVELS) {
    const pz = mustParseChase(level.grid);
    const t = solveChase(pz);
    // Every slime reply, not just its best one: the hint must win from all of them.
    const walk = (s: ChaseState, left: number): void => {
      assert.ok(left > 0, `${level.id}: took longer than promised`);
      const way = bestMove(pz, t, s);
      assert.ok(way, `${level.id}: no hint`);
      const after = moveFriend(s, way![0], way![1]);
      const st = statusOf(pz, after);
      if (st === 'mate') return;
      assert.notEqual(st, 'stalemate', `${level.id}: the hint stalemates`);
      const steps = slimeSteps(pz, after);
      assert.ok(steps.every((to) => eatenBy(after, to) < 0), `${level.id}: the hint leaves a friend to be eaten`);
      for (const to of steps) walk({ slime: to, friends: after.friends }, left - 1);
    };
    walk(pz.start, level.moves);
  }
});

test('the slime never steps where it could be caught sooner', () => {
  const pz = mustParseChase(CHASE_LEVELS[4].grid);
  const t = solveChase(pz);
  const way = bestMove(pz, t, pz.start)!;
  const after = moveFriend(pz.start, way[0], way[1]);
  const step = slimeChoice(pz, t, after)!;
  const left = movesToWin(pz, t, { slime: step, friends: after.friends });
  for (const to of slimeSteps(pz, after)) {
    const other = movesToWin(pz, t, { slime: to, friends: after.friends });
    assert.ok(other !== NEVER && other <= left, 'it picked the longest chase');
  }
});

test('every boss can be finished, with its own world\'s friend', () => {
  assert.deepEqual(BOSS_LEVELS.map((b) => b.world), WORLDS.map((w) => w.id), 'one boss per friend world, in world order');
  for (const boss of BOSS_LEVELS) {
    const p = mustParseMate(boss.grid, boss.tray);
    assert.ok(solveMate(p, [], 1).length === 1, `${boss.id} can be finished`);
    const world = WORLDS.find((w) => w.id === boss.world)!;
    if (boss.world !== 'friends') {
      assert.ok([...boss.tray].every((ch) => KIND_BY_CHAR[ch] === world.faces[0]), `${boss.id}: only the ${boss.world} in the tray`);
    }
  }
});

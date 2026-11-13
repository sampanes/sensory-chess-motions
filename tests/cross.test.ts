import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CROSS_LEVELS } from '../src/content/crossing.ts';
import { crossHop, crossStart, crossWon, mustParseCross, parseCross, reachMap, reachSteps, solveCross } from '../src/core/cross.ts';

test('a crossing is won when every friend stands on a home square', () => {
  const p = mustParseCross(['o..', '...', 'R..']);
  const s = crossStart(p);
  assert.ok(!crossWon(p, s));
  const res = crossHop(p, s, { friend: 0, to: 0 });
  assert.ok(crossWon(p, res.state));
});

test('the reach map: the bishop never reaches the other color, the knight jumps a hedge', () => {
  const field = mustParseCross(['o...o', '.....', '#####', '.....', 'B.N..']);
  const bishop = reachMap(field, 'bishop', field.friends[0].at);
  for (const pos of bishop) {
    const r = Math.floor(pos / 5);
    assert.equal((r + (pos % 5)) % 2, 0, `bishop on its own color only (${pos})`);
    assert.ok(r > 2, 'and never past the hedge');
  }
  const knight = reachMap(field, 'knight', field.friends[1].at);
  assert.ok([...knight].some((pos) => pos < 10), 'the knight lands past the hedge');
});

test('footprints: the fewest hops each friend needs alone', () => {
  const open = mustParseCross(['....o', '.....', '.....', '.....', 'R....']);
  const at = (r: number, c: number) => r * 5 + c;
  const rook = reachSteps(open, 'rook', at(4, 0));
  assert.equal(rook.get(at(4, 0)), 0, 'where it stands');
  assert.equal(rook.get(at(0, 0)), 1, 'straight up its lane');
  assert.equal(rook.get(at(0, 4)), 2, 'a corner turn');
  // The bishop gets to the far corner in one slide; the knight and the king need many small hops.
  assert.equal(reachSteps(open, 'bishop', at(4, 0)).get(at(0, 4)), 1);
  assert.equal(reachSteps(open, 'knight', at(4, 0)).get(at(0, 4)), 4);
  assert.equal(reachSteps(open, 'king', at(4, 0)).get(at(0, 4)), 4);
  // What a friend can never reach has no footprints at all, and the map agrees with reachMap.
  const bishop = reachSteps(open, 'bishop', at(4, 0));
  assert.equal(bishop.get(at(0, 3)), undefined, 'the other color');
  assert.deepEqual([...bishop.keys()].sort((a, b) => a - b), [...reachMap(open, 'bishop', at(4, 0))].sort((a, b) => a - b));
  // In every lab field, each friend is at most 8 hops from a home it can reach (that many prints fit).
  for (const l of CROSS_LEVELS) {
    const p = mustParseCross(l.grid);
    for (const f of p.friends) {
      const steps = reachSteps(p, f.kind, f.at);
      for (const h of p.homes) if (steps.has(h)) assert.ok(steps.get(h)! <= 8, `${l.id}: ${f.kind} is ${steps.get(h)} hops from home`);
    }
  }
});

test('crossing grids are checked', () => {
  assert.equal(parseCross(['o.o', '...', 'R..']).ok, false, 'one home per friend');
  assert.equal(parseCross(['...', '...', 'R..']).ok, false, 'needs a home');
  assert.equal(parseCross(['o..', '...', 'R..']).ok, true);
});

test('every crossing can be finished, and each friend has a home it can reach', () => {
  const ids = new Set<string>();
  for (const l of CROSS_LEVELS) {
    assert.ok(!ids.has(l.id), l.id);
    ids.add(l.id);
    const p = mustParseCross(l.grid);
    const res = solveCross(p, crossStart(p));
    assert.equal(res.status, 'solved', l.id);
    if (res.status === 'solved') assert.ok(res.moves.length <= 8, `${l.id}: ${res.moves.length} hops`);
    for (const f of p.friends) {
      assert.ok(p.homes.some((h) => reachMap(p, f.kind, f.at).has(h)), `${l.id}: the ${f.kind} has no home`);
    }
  }
});

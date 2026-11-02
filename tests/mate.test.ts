import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BEDTIME_LEVELS } from '../src/content/bedtime.ts';
import {
  canPlace, coverage, drop, escapes, friendsOf, mateStatus, mustParseMate, parseMate, solveMate,
  type MatePuzzle, type Placement,
} from '../src/core/mate.ts';

const at = (p: MatePuzzle, r: number, c: number) => r * p.cols + c;
const statusWith = (p: MatePuzzle, placed: Placement[]) => mateStatus(p, friendsOf(p, placed));

test('back-rank mate: rook checks along the row, rocks wall him in', () => {
  const p = mustParseMate(['..k..', '.###.', '.....'], 'R');
  assert.equal(statusWith(p, [{ tray: 0, at: at(p, 0, 0) }]), 'mate');
});

test('a line through the king still watches the square behind him', () => {
  const p = mustParseMate(['..k..', '.###.', '.....'], 'R');
  const cover = coverage(p, friendsOf(p, [{ tray: 0, at: at(p, 0, 0) }]));
  assert.ok(cover.has(at(p, 0, 3)), 'the square on the far side of the king must be watched');
});

test('the king can take a lonely friend next to him, but not a protected one', () => {
  const p = mustParseMate(['.k.', '...', '...'], 'QK');
  // Queen alone right in front of him: he could take it, so not mate.
  const lonely = friendsOf(p, [{ tray: 0, at: at(p, 1, 1) }]);
  assert.ok(escapes(p, lonely).includes(at(p, 1, 1)));
  // With your king behind the queen it is protected: mate.
  assert.equal(statusWith(p, [{ tray: 0, at: at(p, 1, 1) }, { tray: 1, at: at(p, 2, 1) }]), 'mate');
});

test('dropping a lonely friend next to the king gets it shooed back to the tray', () => {
  const p = mustParseMate(['.k.', '...', '...'], 'QK');
  const res = drop(p, [], 0, at(p, 1, 1));
  assert.deepEqual(res, { placed: [], shooed: [0] });
  // Protected first, then dropped: it stays.
  const guarded = drop(p, [{ tray: 1, at: at(p, 2, 1) }], 0, at(p, 1, 1));
  assert.deepEqual(guarded.shooed, []);
});

test('your king may never stand next to the grumpy king', () => {
  const p = mustParseMate(['.k.', '...', '...'], 'K');
  assert.equal(canPlace(p, [], 'king', at(p, 1, 1)), false);
  assert.equal(canPlace(p, [], 'king', at(p, 2, 1)), true);
});

test('everything covered but no check is stalemate, not bedtime', () => {
  // King in the corner, rook on the row below and the column next door, no check.
  const p = mustParseMate(['k..', '...', '...'], 'RR');
  assert.equal(statusWith(p, [{ tray: 0, at: at(p, 1, 2) }, { tray: 1, at: at(p, 2, 1) }]), 'stalemate');
});

test('smothered mate: walled in, the knight checks over the rocks', () => {
  const p = mustParseMate(['k#.', '##.', '...'], 'N');
  assert.equal(statusWith(p, [{ tray: 0, at: at(p, 2, 1) }]), 'mate');
});

test('two-rook ladder', () => {
  const p = mustParseMate(['..k..', '.....', '.....'], 'RR');
  assert.equal(statusWith(p, [{ tray: 0, at: at(p, 1, 0) }, { tray: 1, at: at(p, 0, 4) }]), 'mate');
});

test('parse errors are reported, not thrown', () => {
  assert.equal(parseMate(['...', '...', '...'], 'R').ok, false);
  assert.equal(parseMate(['k..', '...', '...'], '').ok, false);
  assert.equal(parseMate(['k..', '...', '...'], 'X').ok, false);
});

test('every bedtime puzzle parses, is not already won, and can be finished', () => {
  for (const l of BEDTIME_LEVELS) {
    const res = parseMate(l.grid, l.tray);
    assert.ok(res.ok, `${l.id}: ${res.ok ? '' : res.error}`);
    if (!res.ok) continue;
    assert.notEqual(statusWith(res.puzzle, []), 'mate', `${l.id} starts already won`);
    const ways = solveMate(res.puzzle);
    assert.ok(ways.length > 0, `${l.id} cannot be finished`);
    // Every solution is a real sequence of drops the king never undoes.
    for (const way of ways) {
      let placed: Placement[] = [];
      for (const step of way) {
        const r = drop(res.puzzle, placed, step.tray, step.at);
        assert.deepEqual(r.shooed, [], `${l.id}: a solution step gets shooed`);
        placed = r.placed;
      }
      assert.equal(statusWith(res.puzzle, placed), 'mate', `${l.id}: a solution does not end in mate`);
    }
  }
});

test('the first bedtime puzzle needs only one drop', () => {
  const p = mustParseMate(BEDTIME_LEVELS[0].grid, BEDTIME_LEVELS[0].tray);
  assert.equal(Math.min(...solveMate(p).map((w) => w.length)), 1);
});

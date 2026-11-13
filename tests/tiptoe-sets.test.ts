// The three tiptoe sets each teach what they claim to:
//   sneak  the eight original puzzles
//   shoo   a capture is needed, and no capture is ever a trap
//   safe   a capture is needed, and an unsafe capture (a protected guard) tempts the kid at once
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TIPTOE_LEVELS, type TiptoeSet } from '../src/content/tiptoe.ts';
import {
  guardAt, mustParseSneak, parseSneak, sneakHop, sneakHops, sneakStart, solveSneak,
  type SneakPuzzle, type SneakState,
} from '../src/core/sneak.ts';

const inSet = (name: TiptoeSet) => TIPTOE_LEVELS.filter((l) => l.set === name);

/** Captures on offer in this position that would wake another guard. */
function unsafeCaptures(p: SneakPuzzle, s: SneakState): number {
  let n = 0;
  for (let fi = 0; fi < s.friends.length; fi++) {
    for (const to of sneakHops(p, s, fi)) {
      if (guardAt(s, to) >= 0 && sneakHop(p, s, { friend: fi, to }).kind === 'wake') n++;
    }
  }
  return n;
}

/** Every position reachable without waking anyone, by how many hops it takes (up to maxHops). */
function reachable(p: SneakPuzzle, maxHops: number): SneakState[][] {
  const key = (s: SneakState) => `${s.left}|${s.guards}|${s.friends.map((f) => f.kind + f.at).join(',')}`;
  const seen = new Set([key(sneakStart(p))]);
  const layers: SneakState[][] = [[sneakStart(p)]];
  for (let d = 0; d < maxHops; d++) {
    const next: SneakState[] = [];
    for (const s of layers[d]) {
      for (let fi = 0; fi < s.friends.length; fi++) {
        for (const to of sneakHops(p, s, fi)) {
          const res = sneakHop(p, s, { friend: fi, to });
          if (res.kind !== 'ok' || seen.has(key(res.state))) continue;
          seen.add(key(res.state));
          next.push(res.state);
        }
      }
    }
    layers.push(next);
  }
  return layers;
}

test('three sets of eight, with ids that never change', () => {
  assert.deepEqual(inSet('sneak').map((l) => l.id), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `tiptoe-${n}`));
  assert.deepEqual(inSet('shoo').map((l) => l.id), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `shoo-${n}`));
  assert.deepEqual(inSet('safe').map((l) => l.id), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `safe-${n}`));
  assert.equal(TIPTOE_LEVELS.length, 24);
  // Sets stay together, in order.
  assert.deepEqual([...new Set(TIPTOE_LEVELS.map((l) => l.set))], ['sneak', 'shoo', 'safe']);
});

test('shoo: the treat cannot be had without sending a guard home, and no capture is a trap', () => {
  for (const l of inSet('shoo')) {
    const p = mustParseSneak(l.grid);
    const start = sneakStart(p);
    const res = solveSneak(p, start);
    assert.equal(res.status, 'solved', l.id);
    if (res.status === 'solved') assert.ok(res.moves.length >= 2 && res.moves.length <= 6, `${l.id}: ${res.moves.length} hops`);
    assert.equal(solveSneak(p, start, 200_000, false).status, 'stuck', `${l.id} can be finished without a capture`);
    for (const layer of reachable(p, 6)) {
      for (const s of layer) assert.equal(unsafeCaptures(p, s), 0, `${l.id} has a protected guard`);
    }
  }
});

test('stay safe: a capture is needed, and a protected guard tempts the kid from the start', () => {
  for (const l of inSet('safe')) {
    const p = mustParseSneak(l.grid);
    const start = sneakStart(p);
    const res = solveSneak(p, start);
    assert.equal(res.status, 'solved', l.id);
    if (res.status === 'solved') assert.ok(res.moves.length >= 4 && res.moves.length <= 6, `${l.id}: ${res.moves.length} hops`);
    assert.equal(solveSneak(p, start, 200_000, false).status, 'stuck', `${l.id} can be finished without a capture`);
    assert.ok(p.guards.length >= 2, `${l.id} needs a protector`);
    const [now, soon] = reachable(p, 1);
    const tempting = unsafeCaptures(p, now[0]) + soon.reduce((n, s) => n + unsafeCaptures(p, s), 0);
    assert.ok(tempting > 0, `${l.id}: no unsafe capture on offer at the start or one hop later`);
  }
});

test('every guard matters: without it the puzzle is shorter (or it is the only guard)', () => {
  for (const l of [...inSet('shoo'), ...inSet('safe')]) {
    const p = mustParseSneak(l.grid);
    const full = solveSneak(p, sneakStart(p));
    assert.equal(full.status, 'solved', l.id);
    if (full.status !== 'solved') continue;
    for (const g of p.guards) {
      const grid = l.grid.map((row, r) => row.split('').map((ch, c) => (r * p.cols + c === g.at ? '.' : ch)).join(''));
      const less = parseSneak(grid);
      if (!less.ok) continue; // the last guard
      const res = solveSneak(less.puzzle, sneakStart(less.puzzle));
      assert.ok(res.status === 'solved' && res.moves.length < full.moves.length, `${l.id}: the guard on ${g.at} changes nothing`);
    }
  }
});

test('a team puzzle needs both friends', () => {
  for (const l of TIPTOE_LEVELS) {
    const p = mustParseSneak(l.grid);
    if (p.friends.length < 2) continue;
    for (const f of p.friends) {
      const grid = l.grid.map((row, r) => row.split('').map((ch, c) => (r * p.cols + c === f.at ? '.' : ch)).join(''));
      const alone = parseSneak(grid);
      if (!alone.ok) continue;
      assert.equal(solveSneak(alone.puzzle, sneakStart(alone.puzzle)).status, 'stuck', `${l.id} works without the ${f.kind}`);
    }
  }
});

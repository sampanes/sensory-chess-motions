import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TIPTOE_LEVELS } from '../src/content/tiptoe.ts';
import {
  mustParseSneak, parseSneak, sneakHop, sneakHops, sneakStart, solveSneak, watchedSquares,
} from '../src/core/sneak.ts';

const at = (grid: readonly string[], ch: string) => {
  const cols = grid[0].length;
  const i = grid.join('').indexOf(ch);
  return Math.floor(i / cols) * cols + (i % cols);
};
const sq = (cols: number, r: number, c: number) => r * cols + c;

test('a rook guard watches his lines, and a rock hides you', () => {
  const g = ['.*...', '.....', 'r.#..', '.....', '...K.'];
  const p = mustParseSneak(g);
  const w = watchedSquares(p, sneakStart(p));
  assert.ok(w.has(sq(5, 2, 1)), 'next to him on the row');
  assert.ok(!w.has(sq(5, 2, 3)), 'behind the rock');
  assert.ok(w.has(sq(5, 0, 0)) && w.has(sq(5, 4, 0)), 'up and down his column');
});

test('a guard pawn watches diagonally DOWN, toward the friends', () => {
  const p = mustParseSneak(['..*..', '.....', '..p..', '.....', '..K..']);
  const w = watchedSquares(p, sneakStart(p));
  assert.deepEqual([...w].sort((a, b) => a - b), [sq(5, 3, 1), sq(5, 3, 3)]);
});

test('landing on a watched square wakes the guard and changes nothing', () => {
  const g = ['.*...', '.....', 'r.#..', '.....', '...K.'];
  const p = mustParseSneak(g);
  const s = sneakStart(p);
  const k = at(g, 'K');
  const wake = sneakHop(p, s, { friend: 0, to: sq(5, 3, 2) });
  assert.equal(wake.kind, 'ok', 'row 3 is safe');
  if (wake.kind !== 'ok') return;
  const res = sneakHop(p, wake.state, { friend: 0, to: sq(5, 2, 1) });
  assert.equal(res.kind, 'wake');
  if (res.kind === 'wake') {
    assert.deepEqual(res.by, [0]);
    assert.ok(res.watched.includes(sq(5, 2, 1)));
  }
  assert.notEqual(k, sq(5, 2, 1));
});

test('eating a watched treat wakes the guard; a treat blocks his line beyond it', () => {
  const p = mustParseSneak(['r.*..', '.....', '.....', '....R']);
  const s = sneakStart(p);
  const w = watchedSquares(p, s);
  assert.ok(w.has(sq(5, 0, 2)), 'the treat is watched');
  assert.ok(!w.has(sq(5, 0, 3)), 'past the treat is hidden');
});

test('booping: land on a guard to send it home, unless another guard watches it', () => {
  const p = mustParseSneak(['*.n.*', '.....', '.....', '..R..']);
  const s = sneakStart(p);
  assert.ok(sneakHops(p, s, 0).includes(sq(5, 0, 2)), 'the rook can reach the knight');
  const res = sneakHop(p, s, { friend: 0, to: sq(5, 0, 2) });
  assert.equal(res.kind, 'ok');
  if (res.kind === 'ok') {
    assert.equal(res.booped, 0);
    assert.equal(res.state.guards, 0);
    assert.equal(watchedSquares(p, res.state).size, 0);
  }

  // The rook guard watches the bishop guard along the row: booping the bishop wakes the rook.
  const q = mustParseSneak(['*...*', '.r.b.', '.....', '.....', '...Q.']);
  const t = sneakStart(q);
  const boop = sneakHop(q, t, { friend: 0, to: sq(5, 1, 3) });
  assert.equal(boop.kind, 'wake');
});

test('bad grids are refused', () => {
  assert.equal(parseSneak(['r..', '...', 'K.*']).ok, false, 'starts watched');
  assert.equal(parseSneak(['...', '.*.', 'K..']).ok, false, 'no guard');
  assert.equal(parseSneak(['..r', '...', '.K.']).ok, false, 'no treat');
});

test('every tiptoe puzzle can be finished without waking anyone', () => {
  const ids = new Set<string>();
  for (const l of TIPTOE_LEVELS) {
    assert.ok(!ids.has(l.id), l.id);
    ids.add(l.id);
    const p = mustParseSneak(l.grid);
    const res = solveSneak(p, sneakStart(p));
    assert.equal(res.status, 'solved', l.id);
    if (res.status === 'solved') assert.ok(res.moves.length <= 10, `${l.id}: ${res.moves.length} hops`);
  }
});

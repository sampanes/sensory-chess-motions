import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRIEND_BODIES } from '../src/ui/friendBodies.ts';

const KINDS = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'] as const;

test('every friend has a traced body with a fill and an outline', () => {
  for (const kind of KINDS) {
    const roles = new Set(FRIEND_BODIES[kind].map(([role]) => role));
    assert.ok(roles.has('fill') && roles.has('dark'), kind);
  }
  assert.ok(FRIEND_BODIES.king.some(([role]) => role === 'ruby'), 'the king keeps his jewels');
});

test('the traced bodies stay small and inside the 0..100 box', () => {
  for (const kind of KINDS) {
    const chars = FRIEND_BODIES[kind].reduce((n, [, d]) => n + d.length, 0);
    assert.ok(chars <= 6000, `${kind}: ${chars} characters of path`);
    for (const [, d] of FRIEND_BODIES[kind]) {
      const m = /^M(-?[\d.]+) (-?[\d.]+)/.exec(d);
      assert.ok(m, `${kind}: a path starts with an absolute move`);
      const [x, y] = [Number(m[1]), Number(m[2])];
      assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `${kind}: starts at ${x},${y}`);
    }
  }
});

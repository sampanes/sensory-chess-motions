import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAWN_LEVELS, PAWN_RULES } from '../src/content/pawnwalk.ts';
import {
  mustParseSneak, parseSneak, sneakHop, sneakStart, sneakWon, solveSneak, watchers, type SneakPuzzle,
} from '../src/core/sneak.ts';

const HOME = { goal: 'home', race: false } as const;
const RACE = { goal: 'home', race: true } as const;
const sq = (cols: number, r: number, c: number) => r * cols + c;

test('the pawn walk is won when the pawn reaches the top row and becomes a queen', () => {
  const p = mustParseSneak(['...', '...', '.P.'], HOME);
  let s = sneakStart(p);
  for (const to of [sq(3, 1, 1), sq(3, 0, 1)]) {
    assert.ok(!sneakWon(p, s));
    const res = sneakHop(p, s, { friend: 0, to });
    assert.equal(res.kind, 'ok');
    if (res.kind !== 'ok') return;
    s = res.state;
  }
  assert.equal(s.friends[0].kind, 'queen');
  assert.ok(sneakWon(p, s));
});

test('a racing guard pawn walks down after every hop, and getting home first loses', () => {
  const p = mustParseSneak(['.p...', '.....', '.....', '....P'], RACE);
  const first = sneakHop(p, sneakStart(p), { friend: 0, to: sq(5, 2, 4) });
  assert.equal(first.kind, 'ok');
  if (first.kind !== 'ok') return;
  assert.deepEqual(first.walked, [0]);
  assert.equal(first.state.gpos[0], sq(5, 1, 1));
  assert.equal(first.hopped.gpos[0], sq(5, 0, 1), 'the hop itself leaves the guard where it was');
  const second = sneakHop(p, first.state, { friend: 0, to: sq(5, 1, 4) });
  assert.equal(second.kind, 'ok');
  if (second.kind !== 'ok') return;
  const third = sneakHop(p, second.state, { friend: 0, to: sq(5, 0, 4) });
  assert.equal(third.kind, 'ok', 'your pawn gets home first and wins before the guard steps');
  if (third.kind === 'ok') assert.ok(sneakWon(p, third.state));

  // One square further away, the guard pawn wins the race.
  const far = mustParseSneak(['.....', '.p...', '.....', '.....', '....P'], RACE);
  assert.equal(solveSneak(far, sneakStart(far)).status, 'stuck');
});

test('a friend standing in front of a racing pawn stops it (a blockade)', () => {
  const p = mustParseSneak(['.p...', '.....', '.R...', '.....', '....P'], RACE);
  let s = sneakStart(p);
  const hop = sneakHop(p, s, { friend: 1, to: sq(5, 3, 4) });
  assert.equal(hop.kind, 'ok');
  if (hop.kind !== 'ok') return;
  s = hop.state;
  assert.equal(s.gpos[0], sq(5, 1, 1));
  const again = sneakHop(p, s, { friend: 1, to: sq(5, 2, 4) });
  assert.equal(again.kind, 'ok');
  if (again.kind !== 'ok') return;
  assert.deepEqual(again.walked, [], 'the rook stands in front: the pawn cannot step');
  assert.equal(again.state.gpos[0], sq(5, 1, 1));
});

test('a racing pawn may step next to a friend: then it is your move, and you must answer', () => {
  // After the hop the gray pawn steps to (2,1) and watches (3,0) and (3,2): where the rook just went.
  const p = mustParseSneak(['.....', '.p...', '.....', 'R....', '....P'], RACE);
  const res = sneakHop(p, sneakStart(p), { friend: 0, to: sq(5, 3, 2) });
  assert.equal(res.kind, 'ok', 'no waking on their step: it is your move now');
  if (res.kind !== 'ok') return;
  assert.equal(res.state.gpos[0], sq(5, 2, 1));
  assert.deepEqual(watchers(p, res.state), [0]);
  assert.equal(sneakHop(p, res.state, { friend: 1, to: sq(5, 3, 4) }).kind, 'wake', 'leaving the rook watched wakes him');
  assert.equal(sneakHop(p, res.state, { friend: 0, to: sq(5, 3, 3) }).kind, 'ok', 'moving the rook away is fine');
});

test('a gray pawn that steps next to your pawn can be eaten, like in chess', () => {
  const p = mustParseSneak(['.....', '..p..', '.....', '.....', '...P.'], RACE);
  const res = sneakHop(p, sneakStart(p), { friend: 0, to: sq(5, 3, 3) });
  assert.equal(res.kind, 'ok');
  if (res.kind !== 'ok') return;
  assert.equal(res.state.gpos[0], sq(5, 2, 2), 'it stepped next to the pawn');
  const eat = sneakHop(p, res.state, { friend: 0, to: sq(5, 2, 2) });
  assert.equal(eat.kind, 'ok');
  if (eat.kind === 'ok') assert.equal(eat.booped, 0);
  // Walking past it instead loses the race.
  const past = sneakHop(p, res.state, { friend: 0, to: sq(5, 2, 3) });
  assert.equal(past.kind, 'ok');
  if (past.kind === 'ok') assert.equal(solveSneak(p, past.state).status, 'stuck');
});

test('pawn walk grids are checked', () => {
  assert.equal(parseSneak(['...', '...', '.R.'], HOME).ok, false, 'needs a pawn friend');
  assert.equal(parseSneak(['...', '...', '.P.'], RACE).ok, false, 'a race needs a guard pawn');
  assert.equal(parseSneak(['...', '...', 'p.P'], RACE).ok, false, 'a racer cannot start home');
  assert.equal(parseSneak(['...', '...', '.P.'], HOME).ok, true, 'no guards or treats is fine');
});

test('every pawn walk puzzle can be finished, and every helper friend is needed', () => {
  const ids = new Set<string>();
  for (const l of PAWN_LEVELS) {
    assert.ok(!ids.has(l.id), l.id);
    ids.add(l.id);
    const p = mustParseSneak(l.grid, PAWN_RULES(l));
    const res = solveSneak(p, sneakStart(p));
    assert.equal(res.status, 'solved', l.id);
    if (res.status === 'solved') assert.ok(res.moves.length <= 8, `${l.id}: ${res.moves.length} hops`);
    if (p.friends.length > 1) {
      const solo: SneakPuzzle = { ...p, friends: p.friends.filter((f) => f.kind === 'pawn') };
      assert.equal(solveSneak(solo, sneakStart(solo)).status, 'stuck', `${l.id}: the pawn manages alone`);
    }
  }
});

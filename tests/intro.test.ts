import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WORLDS } from '../src/content/worlds.ts';
import { makeFriendIntro } from '../src/core/intro.ts';
import { applyMove, hopsFor } from '../src/core/rules.ts';

test('every world has an empty-board intro made of real legal hops', () => {
  for (const world of WORLDS) {
    const intro = makeFriendIntro(world.faces);
    assert.equal(intro.puzzle.rows, 5, world.id);
    assert.equal(intro.puzzle.cols, 5, world.id);
    assert.deepEqual(intro.puzzle.treats, [], world.id);
    assert.ok(intro.puzzle.rocks.every((rock) => !rock), world.id);
    assert.equal(intro.states.length, intro.moves.length + 1, world.id);
    assert.deepEqual(intro.states[0].friends.map((friend) => friend.kind), [...world.faces], world.id);

    let state = intro.states[0];
    const moved = new Set<number>();
    for (let i = 0; i < intro.moves.length; i++) {
      const move = intro.moves[i];
      assert.ok(hopsFor(intro.puzzle, state, move.friend).includes(move.to), `${world.id} hop ${i + 1}`);
      const result = applyMove(intro.puzzle, state, move);
      assert.ok(result, `${world.id} hop ${i + 1} applies`);
      assert.equal(result.promoted, false, `${world.id} intro should not promote`);
      state = result.state;
      moved.add(move.friend);
      assert.deepEqual(state, intro.states[i + 1], `${world.id} state ${i + 1}`);
    }

    assert.equal(moved.size, world.faces.length, `${world.id} should move every friend`);
    assert.deepEqual(state.friends.map((friend) => friend.kind), [...world.faces], world.id);
  }
});

test('the paired-friends intro demonstrates both tokens without collisions', () => {
  const world = WORLDS.find((item) => item.id === 'friends')!;
  const intro = makeFriendIntro(world.faces);
  assert.deepEqual([...new Set(intro.moves.map((move) => move.friend))], [0, 1]);
  for (const state of intro.states) {
    assert.equal(new Set(state.friends.map((friend) => friend.at)).size, 2);
  }
});

test('unsupported face combinations fail instead of inventing a move lesson', () => {
  assert.throws(() => makeFriendIntro([]), /No friend intro/);
  assert.throws(() => makeFriendIntro(['king', 'queen']), /No friend intro/);
});

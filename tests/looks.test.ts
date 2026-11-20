import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALL_TREATS, BOARD_THEMES, firstBoard, MEADOW, PLAIN_MUSIC, pickLook, REVEAL_WORLD, WOOD } from '../src/content/looks.ts';
import { WORLDS } from '../src/content/worlds.ts';
import { seededRandom } from '../src/core/generate.ts';

const world = { treat: 'berry' as const, sky: '#fef3c7' };

test('a first play always looks like its world', () => {
  assert.deepEqual(pickLook(world, false), { treat: 'berry', board: MEADOW, sky: '#fef3c7', music: PLAIN_MUSIC });
});

test('replays change something you can see, and over time use every treat and board', () => {
  const rand = seededRandom(3);
  const treats = new Set<string>();
  const boards = new Set<string>();
  const voices = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const look = pickLook(world, true, rand);
    assert.ok(look.treat !== 'berry' || look.board !== MEADOW, 'looks exactly like the first play');
    assert.ok(look.sky, 'has a sky');
    treats.add(look.treat);
    boards.add(look.board.id);
    voices.add(look.music.voice);
  }
  assert.equal(treats.size, ALL_TREATS.length);
  assert.equal(boards.size, BOARD_THEMES.length);
  assert.equal(voices.size, 4);
});

test('every world treat is one of the surprise treats', () => {
  for (const w of WORLDS) assert.ok(ALL_TREATS.includes(w.treat), w.id);
});

test('board themes keep a visible light/dark checker', () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (const t of BOARD_THEMES) {
    const gap = lum(t.light) - lum(t.dark);
    assert.ok(gap > 0.05 && gap < 0.2, `${t.id}: light/dark gap ${gap.toFixed(3)}`);
  }
});

test('the board reveal: the last friend world turns from meadow to wood, a little each puzzle', () => {
  const world = WORLDS[WORLDS.length - 1];
  assert.equal(world.id, REVEAL_WORLD);
  const n = world.levels.length;
  assert.equal(firstBoard(world.id, 0, n), MEADOW);
  assert.equal(firstBoard(world.id, n - 1, n), WOOD);
  // Every step is a little further along, and each one looks different from the last.
  const along = (b: { id: string }) => (b.id === 'meadow' ? 0 : b.id === 'wood' ? 100 : Number(b.id.replace('reveal-', '')));
  for (let i = 1; i < n; i++) {
    const [a, b] = [firstBoard(world.id, i - 1, n), firstBoard(world.id, i, n)];
    assert.ok(along(b) > along(a), `step ${i}`);
    assert.notEqual(b.dark, a.dark, `step ${i}`);
  }
  // Every other world stays on the meadow, and the reveal board is the look of a first play.
  for (const w of WORLDS.slice(0, -1)) assert.equal(firstBoard(w.id, w.levels.length - 1, w.levels.length), MEADOW);
  assert.equal(pickLook({ ...world, board: firstBoard(world.id, n - 1, n) }, false).board, WOOD);
});

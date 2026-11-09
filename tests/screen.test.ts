// Phone or big screen: the look is chosen from the screen's own size.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BIG_MIN, screenLook } from '../src/ui/screenMode.ts';

test('phones stay phones, held either way', () => {
  assert.deepEqual(screenLook('auto', 390, 844), { screen: 'phone', layout: 'stack' });
  assert.deepEqual(screenLook('auto', 844, 390), { screen: 'phone', layout: 'side' });
});

test('tablets and touchscreen PCs get the big screen', () => {
  // A 1080p touchscreen at 125% Windows scaling, and at 100%.
  assert.deepEqual(screenLook('auto', 1536, 864), { screen: 'big', layout: 'side' });
  assert.deepEqual(screenLook('auto', 1920, 1080), { screen: 'big', layout: 'side' });
  // An iPad held upright: big, bars stacked above and below the board.
  assert.deepEqual(screenLook('auto', 820, 1180), { screen: 'big', layout: 'stack' });
  assert.equal(screenLook('auto', BIG_MIN, BIG_MIN + 1).screen, 'big');
  assert.equal(screenLook('auto', BIG_MIN - 1, 2000).screen, 'phone');
});

test('a grown-up can force either look', () => {
  assert.deepEqual(screenLook('phone', 1536, 864), { screen: 'phone', layout: 'stack' });
  assert.deepEqual(screenLook('big', 390, 844), { screen: 'big', layout: 'stack' });
  // Forcing phone on a landscape phone still puts the bars beside the board.
  assert.deepEqual(screenLook('phone', 844, 390), { screen: 'phone', layout: 'side' });
});

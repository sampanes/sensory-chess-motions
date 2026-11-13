// More senses: the saved toggles, and the high-contrast board's colors.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOARD_THEMES, HIGH_CONTRAST, MEADOW } from '../src/content/looks.ts';
import { NO_SENSES, parseSenses } from '../src/ui/senses.ts';

test('both toggles are off unless they were saved as on', () => {
  assert.deepEqual(parseSenses(null), NO_SENSES);
  assert.deepEqual(parseSenses(''), NO_SENSES);
  assert.deepEqual(parseSenses('{not json'), NO_SENSES);
  assert.deepEqual(parseSenses('null'), NO_SENSES);
  assert.deepEqual(parseSenses('{"contrast":"yes","buzz":1}'), NO_SENSES, 'only a real true counts');
  assert.deepEqual(parseSenses('{"contrast":true}'), { contrast: true, buzz: false });
  assert.deepEqual(parseSenses('{"contrast":true,"buzz":true}'), { contrast: true, buzz: true });
});

/** WCAG relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('the high-contrast board really has more contrast than the meadow', () => {
  const squares = (t: typeof MEADOW) => contrast(t.light, t.dark);
  assert.ok(squares(HIGH_CONTRAST) > squares(MEADOW) * 1.5, `${squares(HIGH_CONTRAST)} vs ${squares(MEADOW)}`);
  // The frame stands out from both squares, and dark outlines still show on the darker square.
  assert.ok(contrast(HIGH_CONTRAST.rim, HIGH_CONTRAST.light) >= 12);
  assert.ok(contrast(HIGH_CONTRAST.rim, HIGH_CONTRAST.dark) >= 7);
  // It is a grown-up choice, never one of the surprise themes a replay rolls.
  assert.ok(!BOARD_THEMES.includes(HIGH_CONTRAST));
});

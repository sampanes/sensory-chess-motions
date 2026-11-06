// Put every world's levels in play order, easiest first, by difficulty score.
// Run: node scripts/sort-levels.ts
// Rewrites only the order of the lv(...) entries in src/content/worlds.ts;
// ids and grids never change, so saved stars stay on the same puzzles.
// Ties keep their current order. tests/curve.test.ts checks the result.
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty } from '../src/core/difficulty.ts';
import { mustParse } from '../src/core/puzzle.ts';

const path = new URL('../src/content/worlds.ts', import.meta.url);
const text = readFileSync(path, 'utf8');
const eol = text.includes('\r\n') ? '\r\n' : '\n';
let src = text.replace(/\r\n/g, '\n');

const score = new Map<string, number>();
for (const w of WORLDS) {
  for (const l of w.levels) {
    const d = rateDifficulty(mustParse(l.grid));
    if (!d) throw new Error(`${l.id} cannot be finished (or is too big to map)`);
    score.set(l.id, d.score);
  }
}

let moved = 0;
src = src.replace(/(    levels: \[\n)([\s\S]*?)(\n    \],)/g, (_, open: string, body: string, close: string) => {
  const entries = body.split(/\n(?=      lv\()/);
  const idOf = (e: string) => /lv\('([^']+)'/.exec(e)?.[1] ?? '';
  for (const e of entries) {
    if (!score.has(idOf(e))) throw new Error(`Unexpected text in a levels list:\n${e}`);
  }
  const sorted = entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => score.get(idOf(a.e))! - score.get(idOf(b.e))! || a.i - b.i)
    .map((x) => x.e);
  moved += sorted.filter((e, i) => e !== entries[i]).length;
  return open + sorted.join('\n') + close;
});

writeFileSync(path, src.replace(/\n/g, eol));
console.log(moved ? `Reordered ${moved} level(s).` : 'Already in order.');

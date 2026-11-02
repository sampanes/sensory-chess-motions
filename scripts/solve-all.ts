// Dev helper: difficulty of every built-in level, world by world.
// Run: node scripts/solve-all.ts
// Columns are explained in src/core/difficulty.ts. A "<" marks a level that
// scores lower than the one before it in the same world.
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty } from '../src/core/difficulty.ts';
import { mustParse } from '../src/core/puzzle.ts';

const pad = (s: string | number, n: number) => String(s).padStart(n);
console.log(`${'level'.padEnd(12)}${pad('moves', 6)}${pad('bits', 7)}${pad('dead', 6)}${pad('score', 7)}`);
for (const w of WORLDS) {
  let prev = -Infinity;
  for (const l of w.levels) {
    const d = rateDifficulty(mustParse(l.grid));
    if (!d) {
      console.log(`${l.id.padEnd(12)}  CANNOT BE FINISHED (or too big to map)`);
      continue;
    }
    const dead = d.deadEnds > 0 ? `${Math.round(d.deadEnds * 100)}%` : '-';
    const flag = d.score < prev ? '  <' : '';
    console.log(`${l.id.padEnd(12)}${pad(d.moves, 6)}${pad(d.guessBits.toFixed(1), 7)}${pad(dead, 6)}${pad(d.score.toFixed(1), 7)}${flag}`);
    prev = d.score;
  }
  console.log('');
}

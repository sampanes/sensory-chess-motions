// Dev helper: print the shortest solution length of every built-in level.
// Run: node scripts/solve-all.ts
import { WORLDS } from '../src/content/worlds.ts';
import { mustParse, startState } from '../src/core/puzzle.ts';
import { solve } from '../src/core/solver.ts';

for (const w of WORLDS) {
  for (const l of w.levels) {
    const p = mustParse(l.grid);
    const res = solve(p, startState(p));
    const detail = res.status === 'solved' ? `${res.moves.length} moves` : res.status.toUpperCase();
    console.log(`${l.id.padEnd(12)} ${detail}`);
  }
}

// Make new levels for a world, aimed at the biggest gaps in its difficulty climb.
// Run: node scripts/generate.ts <world> [how-many] [--seed N] [--write]
//   how-many  new levels to make (default: enough to reach 15 in the world)
//   --seed    which random run (default 1); the same seed gives the same levels
//   --write   add them to src/content/worlds.ts (then run scripts/sort-levels.ts)
// Without --write it only prints the levels, ready to read and paste.
// Every printed level already passes the bar in src/core/generate.ts; look at
// each one anyway before it ships.
import { readFileSync, writeFileSync } from 'node:fs';
import { WORLDS } from '../src/content/worlds.ts';
import { rateDifficulty, type Difficulty } from '../src/core/difficulty.ts';
import { judge, randomGrid, seededRandom, shapeKey, type Shape } from '../src/core/generate.ts';
import { mustParse } from '../src/core/puzzle.ts';
import { KINDS, type Kind } from '../src/core/types.ts';

const TARGET_PER_WORLD = 15;
const TRIES = 30000;

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, i + 1 < args.length && !args[i + 1].startsWith('--') ? 2 : 1)[1] ?? 'yes' : null;
};
const write = flag('--write') !== null;
const seed = Number(flag('--seed') ?? 1);
const [worldId, countArg] = args;
const world = WORLDS.find((w) => w.id === worldId);
if (!world) {
  console.error(`Usage: node scripts/generate.ts <${WORLDS.map((w) => w.id).join('|')}> [how-many] [--seed N] [--write]`);
  process.exit(1);
}
const count = countArg ? Number(countArg) : Math.max(0, TARGET_PER_WORLD - world.levels.length);
const rand = seededRandom(seed);
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function randomShape(): Shape {
  let kinds: Kind[] = [world!.id as Kind];
  if (world!.id === 'friends') {
    const pool = [...KINDS];
    kinds = [];
    for (let n = rand() < 0.15 ? 3 : 2; n > 0; n--) kinds.push(pool.splice(int(0, pool.length - 1), 1)[0]);
  }
  return { kinds, rows: int(3, 6), cols: int(3, 6), treats: int(1, 6), rocks: int(0, 3) };
}

// 1. A pool of good candidates that are not copies of a level we already have.
const taken = new Set(WORLDS.flatMap((w) => w.levels.map((l) => shapeKey(l.grid))));
const pool: { grid: string[]; d: Difficulty; dims: string; treats: number; rocks: number }[] = [];
for (let i = 0; i < TRIES; i++) {
  const shape = randomShape();
  const grid = randomGrid(shape, rand);
  if (!grid) continue;
  const key = shapeKey(grid);
  if (taken.has(key)) continue;
  taken.add(key);
  const d = judge(grid);
  if (d) pool.push({ grid, d, dims: `${shape.rows}x${shape.cols}`, treats: shape.treats, rocks: shape.rocks });
}

// 2. Fill the widest gap in the climb, again and again. Prefer rocks (every one
// changes the puzzle), few treats, and board sizes the world has few of.
const scores = world.levels.map((l) => rateDifficulty(mustParse(l.grid))!.score);
const picked: typeof pool = [];
const dims = world.levels.map((l) => `${l.grid.length}x${l.grid[0].length}`);
for (let n = 0; n < count; n++) {
  const climb = [...scores, ...picked.map((p) => p.d.score)].sort((a, b) => a - b);
  const gaps = climb.slice(1).map((hi, i) => ({ lo: climb[i], hi })).sort((a, b) => b.hi - b.lo - (a.hi - a.lo));
  let choice: (typeof pool)[number] | undefined;
  for (const { lo, hi } of gaps) {
    const mid = (lo + hi) / 2;
    const fits = pool.filter((p) => !picked.includes(p) && p.d.score > lo + 0.4 && p.d.score < hi - 0.4);
    const near = fits.filter((p) => Math.abs(p.d.score - mid) <= (hi - lo) / 4);
    const cost = (p: (typeof pool)[number]) =>
      0.5 * p.treats - p.rocks + 3 * dims.filter((x) => x === p.dims).length + Math.abs(p.d.score - mid);
    choice = (near.length ? near : fits).sort((a, b) => cost(a) - cost(b))[0];
    if (choice) break;
  }
  if (!choice) break;
  picked.push(choice);
  dims.push(choice.dims);
}

// 3. Print (and maybe write) them with the next unused ids.
const used = new Set(world.levels.map((l) => l.id));
let next = 1;
const nextId = () => {
  while (used.has(`${world.id}-${next}`)) next++;
  used.add(`${world.id}-${next}`);
  return `${world.id}-${next}`;
};
const entries = picked
  .sort((a, b) => a.d.score - b.d.score)
  .map((p) => {
    const id = nextId();
    console.log(`// ${id}: ${p.d.moves} hops, score ${p.d.score}`);
    return `      lv('${id}',\n${p.grid.map((r) => `        '${r}'`).join(',\n')}),`;
  });
console.log(entries.join('\n'));
console.log(`// ${picked.length} new level(s) from ${pool.length} good candidates (seed ${seed}).`);

if (write && entries.length) {
  const path = new URL('../src/content/worlds.ts', import.meta.url);
  const text = readFileSync(path, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const src = text.replace(/\r\n/g, '\n');
  const start = src.indexOf(`id: '${world.id}',`);
  const end = src.indexOf('\n    ],', start);
  if (start < 0 || end < 0) throw new Error(`Cannot find the levels of ${world.id}`);
  writeFileSync(path, (src.slice(0, end) + '\n' + entries.join('\n') + src.slice(end)).replace(/\n/g, eol));
  console.log('// Written. Now run: node scripts/sort-levels.ts');
}

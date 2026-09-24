// House rule: project files are plain ASCII (no emoji, smart quotes, arrows...).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOTS = ['src', 'tests', 'scripts', 'public', 'index.html', 'README.md', 'ROADMAP.md', 'package.json', 'vite.config.ts'];

const BINARY = /\.(png|jpe?g|webp|ico)$/i;

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return BINARY.test(path) ? [] : [path];
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

test('every project file is plain ASCII', () => {
  const offenders: string[] = [];
  for (const file of ROOTS.flatMap(files)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/[^\x09\x0a\x0d\x20-\x7e]/.test(line)) offenders.push(`${file}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

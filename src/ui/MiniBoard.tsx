// Tiny picture of a puzzle, used as the level button. Kids pick levels by
// what they look like -- no numbers needed.

import { parseGrid } from '../core/puzzle.ts';
import { PALETTE, TREAT_COLOR } from './art.tsx';
import type { TreatKind } from '../content/worlds.ts';

export function MiniBoard({ grid, treat }: { grid: readonly string[]; treat: TreatKind }) {
  const res = parseGrid(grid);
  if (!res.ok) return null;
  const { rows, cols, rocks, treats, friends } = res.puzzle;
  return (
    <svg viewBox={`0 0 ${cols * 10} ${rows * 10}`} className="fill" aria-hidden="true">
      {Array.from({ length: rows * cols }, (_, pos) => {
        const r = Math.floor(pos / cols);
        const c = pos % cols;
        return (
          <rect key={pos} x={c * 10} y={r * 10} width={10} height={10} fill={(r + c) % 2 ? '#bfe6a4' : '#eaf7d8'} />
        );
      })}
      {rocks.map((rock, pos) =>
        rock ? <circle key={`r${pos}`} cx={(pos % cols) * 10 + 5} cy={Math.floor(pos / cols) * 10 + 5} r={3.8} fill="#a8a29e" /> : null,
      )}
      {treats.map((pos) => (
        <circle key={`t${pos}`} cx={(pos % cols) * 10 + 5} cy={Math.floor(pos / cols) * 10 + 5} r={2.6} fill={TREAT_COLOR[treat]} stroke="#0003" strokeWidth={0.6} />
      ))}
      {friends.map((f) => (
        <circle
          key={`f${f.at}`}
          cx={(f.at % cols) * 10 + 5}
          cy={Math.floor(f.at / cols) * 10 + 5}
          r={3.8}
          fill={PALETTE[f.kind].fill}
          stroke={PALETTE[f.kind].dark}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

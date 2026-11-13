// Picker for a sneak mode (tiptoe puzzles, the pawn walk). Every puzzle is
// open from the start: new modes never wait for the friend worlds to be
// finished. A mode with sets (tiptoe: sneak, shoo, stay safe) shows each set
// as its own block of tiles.

import type { Progress } from '../core/progress.ts';
import { mustParseSneak, type SneakRules } from '../core/sneak.ts';
import { GRUMPY, HomeIcon, PALETTE, StarIcon } from './art.tsx';
import { levelSets, type SneakMode } from './sneakModes.tsx';
import { sfx, wakeAudio } from './sound.ts';

export function TiptoeWorld({ mode, progress, onPlay, onHome }: {
  mode: SneakMode;
  progress: Progress;
  onPlay: (levelIndex: number) => void;
  onHome: () => void;
}) {
  const next = mode.levels.findIndex((l) => !progress.done.includes(l.id));
  return (
    <div className="screen world" style={{ background: mode.sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="world-hero">{mode.hero('hero-friend')}</div>
        <div className="round-btn-spacer" />
      </div>
      {levelSets(mode.levels).map((group) => (
        <div key={group.set} className="level-grid level-set">
          {group.levels.map(({ level: l, index: li }) => {
            const done = progress.done.includes(l.id);
            return (
              <button
                key={l.id}
                className={`level-tile ${li === next ? 'suggest' : ''}`}
                onClick={() => { wakeAudio(); sfx.tap(); onPlay(li); }}
                aria-label={`${mode.name} ${li + 1}${done ? ', done' : ''}`}
              >
                <TiptoeMini grid={l.grid} rules={mode.rules(l)} />
                {done && <StarIcon className="tile-star" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Tiny picture of a sneak puzzle: rocks, treats, friends, the gray guards, and a gold home row. */
function TiptoeMini({ grid, rules }: { grid: readonly string[]; rules: Partial<SneakRules> }) {
  const p = mustParseSneak(grid, rules);
  const dot = (pos: number) => ({ cx: (pos % p.cols) * 10 + 5, cy: Math.floor(pos / p.cols) * 10 + 5 });
  return (
    <svg viewBox={`0 0 ${p.cols * 10} ${p.rows * 10}`} className="fill" aria-hidden="true">
      {Array.from({ length: p.rows * p.cols }, (_, pos) => {
        const r = Math.floor(pos / p.cols);
        const c = pos % p.cols;
        return <rect key={pos} x={c * 10} y={r * 10} width={10} height={10} fill={(r + c) % 2 ? '#bfe6a4' : '#eaf7d8'} />;
      })}
      {p.goal === 'home' && <rect x={0} y={0} width={p.cols * 10} height={10} fill="#facc15" opacity={0.5} />}
      {p.race && <rect x={0} y={(p.rows - 1) * 10} width={p.cols * 10} height={10} fill="#64748b" opacity={0.3} />}
      {p.rocks.map((rock, pos) => (rock ? <circle key={`r${pos}`} {...dot(pos)} r={3.8} fill="#a8a29e" /> : null))}
      {p.treats.map((pos) => <circle key={`t${pos}`} {...dot(pos)} r={2.6} fill="#ef4444" />)}
      {p.guards.map((g) => (
        <circle key={`g${g.at}`} {...dot(g.at)} r={3.8} fill={GRUMPY.fill} stroke={GRUMPY.dark} strokeWidth={1.2} />
      ))}
      {p.friends.map((f) => (
        <circle key={`f${f.at}`} {...dot(f.at)} r={3.8} fill={PALETTE[f.kind].fill} stroke={PALETTE[f.kind].dark} strokeWidth={1.2} />
      ))}
    </svg>
  );
}

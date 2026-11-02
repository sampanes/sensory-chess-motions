// Picker for the bedtime puzzles. Every one is open from the start: new modes
// never wait for the friend worlds to be finished.

import { BEDTIME_LEVELS, BEDTIME_SKY } from '../content/bedtime.ts';
import { mustParseMate } from '../core/mate.ts';
import type { Progress } from '../core/progress.ts';
import { FriendArt, GRUMPY, HomeIcon, PALETTE, StarIcon } from './art.tsx';
import { sfx, wakeAudio } from './sound.ts';

export function BedtimeWorld({ progress, onPlay, onHome }: {
  progress: Progress;
  onPlay: (levelIndex: number) => void;
  onHome: () => void;
}) {
  const next = BEDTIME_LEVELS.findIndex((l) => !progress.done.includes(l.id));
  return (
    <div className="screen world" style={{ background: BEDTIME_SKY }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="world-hero">
          <FriendArt kind="king" colors={GRUMPY} mood="grumpy" className="hero-friend" />
        </div>
        <div className="round-btn-spacer" />
      </div>
      <div className="level-grid">
        {BEDTIME_LEVELS.map((l, li) => {
          const done = progress.done.includes(l.id);
          return (
            <button
              key={l.id}
              className={`level-tile ${li === next ? 'suggest' : ''}`}
              onClick={() => { wakeAudio(); sfx.tap(); onPlay(li); }}
              aria-label={`Bedtime puzzle ${li + 1}${done ? ', done' : ''}`}
            >
              <BedtimeMini grid={l.grid} tray={l.tray} />
              {done && <StarIcon className="tile-star" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tiny picture of a bedtime puzzle: the board, the grumpy king, and the tray friends underneath. */
function BedtimeMini({ grid, tray }: { grid: readonly string[]; tray: string }) {
  const p = mustParseMate(grid, tray);
  const w = p.cols * 10;
  const h = p.rows * 10;
  const dot = (pos: number) => ({ cx: (pos % p.cols) * 10 + 5, cy: Math.floor(pos / p.cols) * 10 + 5 });
  return (
    <svg viewBox={`0 0 ${w} ${h + 12}`} className="fill" aria-hidden="true" style={{ background: '#eef2ff' }}>
      {Array.from({ length: p.rows * p.cols }, (_, pos) => {
        const r = Math.floor(pos / p.cols);
        const c = pos % p.cols;
        return <rect key={pos} x={c * 10} y={r * 10} width={10} height={10} fill={(r + c) % 2 ? '#bfe6a4' : '#eaf7d8'} />;
      })}
      {p.rocks.map((rock, pos) => (rock ? <circle key={`r${pos}`} {...dot(pos)} r={3.8} fill="#a8a29e" /> : null))}
      <circle {...dot(p.king)} r={3.8} fill={GRUMPY.fill} stroke={GRUMPY.dark} strokeWidth={1.2} />
      {p.fixed.map((f) => (
        <circle key={`f${f.at}`} {...dot(f.at)} r={3.8} fill={PALETTE[f.kind].fill} stroke={PALETTE[f.kind].dark} strokeWidth={1.2} />
      ))}
      {p.tray.map((k, i) => (
        <circle
          key={`t${i}`}
          cx={w / 2 + (i - (p.tray.length - 1) / 2) * 10}
          cy={h + 6}
          r={3.8}
          fill={PALETTE[k].fill}
          stroke={PALETTE[k].dark}
          strokeWidth={1.2}
        />
      ))}
    </svg>
  );
}

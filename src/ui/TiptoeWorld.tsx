// Picker for the tiptoe puzzles. Every one is open from the start: new modes
// never wait for the friend worlds to be finished.

import { TIPTOE_LEVELS, TIPTOE_SKY } from '../content/tiptoe.ts';
import type { Progress } from '../core/progress.ts';
import { mustParseSneak } from '../core/sneak.ts';
import { FriendArt, GRUMPY, HomeIcon, PALETTE, StarIcon } from './art.tsx';
import { sfx, wakeAudio } from './sound.ts';

export function TiptoeWorld({ progress, onPlay, onHome }: {
  progress: Progress;
  onPlay: (levelIndex: number) => void;
  onHome: () => void;
}) {
  const next = TIPTOE_LEVELS.findIndex((l) => !progress.done.includes(l.id));
  return (
    <div className="screen world" style={{ background: TIPTOE_SKY }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="world-hero">
          <FriendArt kind="rook" colors={GRUMPY} mood="sleepy" className="hero-friend" />
        </div>
        <div className="round-btn-spacer" />
      </div>
      <div className="level-grid">
        {TIPTOE_LEVELS.map((l, li) => {
          const done = progress.done.includes(l.id);
          return (
            <button
              key={l.id}
              className={`level-tile ${li === next ? 'suggest' : ''}`}
              onClick={() => { wakeAudio(); sfx.tap(); onPlay(li); }}
              aria-label={`Tiptoe puzzle ${li + 1}${done ? ', done' : ''}`}
            >
              <TiptoeMini grid={l.grid} />
              {done && <StarIcon className="tile-star" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Tiny picture of a tiptoe puzzle: rocks, treats, friends, and the gray guards. */
function TiptoeMini({ grid }: { grid: readonly string[] }) {
  const p = mustParseSneak(grid);
  const dot = (pos: number) => ({ cx: (pos % p.cols) * 10 + 5, cy: Math.floor(pos / p.cols) * 10 + 5 });
  return (
    <svg viewBox={`0 0 ${p.cols * 10} ${p.rows * 10}`} className="fill" aria-hidden="true">
      {Array.from({ length: p.rows * p.cols }, (_, pos) => {
        const r = Math.floor(pos / p.cols);
        const c = pos % p.cols;
        return <rect key={pos} x={c * 10} y={r * 10} width={10} height={10} fill={(r + c) % 2 ? '#bfe6a4' : '#eaf7d8'} />;
      })}
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

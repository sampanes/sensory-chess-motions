import { useState } from 'react';
import type { World } from '../content/worlds.ts';
import { isLevelOpen, type Progress } from '../core/progress.ts';
import { FriendArt, HomeIcon, StarIcon } from './art.tsx';
import { MiniBoard } from './MiniBoard.tsx';
import { sfx, wakeAudio } from './sound.ts';
import { WORLD_LEVEL_IDS } from './useProgress.ts';

export function WorldScreen({ world, worldIndex, progress, onPlay, onHome }: {
  world: World;
  worldIndex: number;
  progress: Progress;
  onPlay: (levelIndex: number) => void;
  onHome: () => void;
}) {
  const open = world.levels.map((_, li) => isLevelOpen(progress, WORLD_LEVEL_IDS, worldIndex, li));
  const next = world.levels.findIndex((l, li) => open[li] && !progress.done.includes(l.id));
  const [wiggle, setWiggle] = useState<{ li: number; n: number } | null>(null);

  const tap = (li: number) => {
    wakeAudio();
    if (!open[li]) {
      sfx.nudge();
      setWiggle((w) => ({ li, n: (w?.n ?? 0) + 1 }));
      return;
    }
    sfx.tap();
    onPlay(li);
  };

  return (
    <div className="screen world" style={{ background: world.sky }}>
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="world-hero">
          {world.faces.map((k) => <FriendArt key={k} kind={k} className="hero-friend" />)}
        </div>
        <div className="round-btn-spacer" />
      </div>
      <div className="level-grid">
        {world.levels.map((l, li) => {
          const done = progress.done.includes(l.id);
          const cls = ['level-tile', open[li] ? '' : 'locked', li === next ? 'suggest' : ''].join(' ');
          return (
            <button
              key={wiggle?.li === li ? `${l.id}-${wiggle.n}` : l.id}
              className={`${cls} ${wiggle?.li === li ? 'wobble' : ''}`}
              onClick={() => tap(li)}
              aria-label={`Puzzle ${li + 1}${done ? ', done' : ''}`}
            >
              <MiniBoard grid={l.grid} treat={world.treat} />
              {done && <StarIcon className="tile-star" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

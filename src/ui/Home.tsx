import { useRef, useState } from 'react';
import { WORLDS, type World } from '../content/worlds.ts';
import { doneCount, isWorldOpen, type Progress } from '../core/progress.ts';
import { FriendArt, GearIcon, StarIcon } from './art.tsx';
import { sfx, wakeAudio } from './sound.ts';
import { WORLD_LEVEL_IDS } from './useProgress.ts';

export function Home({ progress, onOpenWorld, onGrownUps }: {
  progress: Progress;
  onOpenWorld: (worldId: string) => void;
  onGrownUps: () => void;
}) {
  const open = WORLDS.map((_, wi) => isWorldOpen(progress, WORLD_LEVEL_IDS, wi));
  // The friend waiting to be played with bounces to say "me next!".
  const suggested = WORLDS.findIndex((w, wi) => open[wi] && doneCount(progress, WORLD_LEVEL_IDS[wi]) < w.levels.length);

  return (
    <div className="screen home">
      <div className="hills" aria-hidden="true" />
      <div className="world-grid">
        {WORLDS.map((w, wi) => (
          <WorldBubble
            key={w.id}
            world={w}
            open={open[wi]}
            bounce={wi === suggested}
            done={doneCount(progress, WORLD_LEVEL_IDS[wi])}
            onOpen={() => onOpenWorld(w.id)}
          />
        ))}
      </div>
      <HoldButton onHeld={onGrownUps} />
    </div>
  );
}

function WorldBubble({ world, open, bounce, done, onOpen }: {
  world: World;
  open: boolean;
  bounce: boolean;
  done: number;
  onOpen: () => void;
}) {
  const [wobble, setWobble] = useState(0);
  const tap = () => {
    wakeAudio();
    if (!open) {
      sfx.snore();
      setWobble((n) => n + 1);
      return;
    }
    sfx.select(world.faces[0]);
    onOpen();
  };
  return (
    <button
      className={`world-bubble ${open ? '' : 'asleep'} ${bounce ? 'suggest' : ''}`}
      onClick={tap}
      aria-label={open ? `Play with ${world.id}` : `${world.id} is sleeping`}
    >
      <div key={wobble} className={`bubble ${wobble ? 'wobble' : ''}`} style={{ background: world.sky }}>
        {world.faces.map((k, i) => (
          <FriendArt
            key={k}
            kind={k}
            mood={open ? 'happy' : 'sleepy'}
            className={world.faces.length > 1 ? `bubble-friend pair-${i}` : 'bubble-friend'}
          />
        ))}
      </div>
      <div className="bubble-stars">
        {world.levels.map((l, i) => <StarIcon key={l.id} filled={i < done} className="mini-star" />)}
      </div>
    </button>
  );
}

/** Grown-ups only: hold for two seconds. Toddler taps don't get in. */
function HoldButton({ onHeld }: { onHeld: () => void }) {
  const timer = useRef<number | null>(null);
  const [holding, setHolding] = useState(false);
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    stop();
    setHolding(true);
    timer.current = window.setTimeout(() => {
      stop();
      onHeld();
    }, 2000);
  };
  return (
    <button
      className={`gear ${holding ? 'holding' : ''}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Grown-ups: press and hold"
    >
      <svg viewBox="0 0 48 48" className="gear-ring" aria-hidden="true">
        <circle cx={24} cy={24} r={21} />
      </svg>
      <GearIcon className="gear-icon" />
    </button>
  );
}

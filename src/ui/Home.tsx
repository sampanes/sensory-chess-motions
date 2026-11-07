import { useEffect, useRef, useState } from 'react';
import { BEDTIME_LEVELS } from '../content/bedtime.ts';
import { PAWN_LEVELS, PAWN_SKY } from '../content/pawnwalk.ts';
import { TIPTOE_LEVELS, TIPTOE_SKY } from '../content/tiptoe.ts';
import { WORLDS, type World } from '../content/worlds.ts';
import { doneCount, isWorldOpen, needsFriendIntro, type Progress } from '../core/progress.ts';
import { FriendArt, GearIcon, GRUMPY, HomeIcon, StarIcon, SunIcon } from './art.tsx';
import { sfx, wakeAudio } from './sound.ts';
import { today, type Today } from './today.ts';
import { WORLD_LEVEL_IDS } from './useProgress.ts';

/** Which friend worlds are open, which one says "me next!", and which just woke up. */
function worldStates(progress: Progress) {
  const open = WORLDS.map((_, wi) => isWorldOpen(progress, WORLD_LEVEL_IDS, wi));
  // The friend waiting to be played with bounces to say "me next!".
  const suggested = WORLDS.findIndex((w, wi) => open[wi] && doneCount(progress, WORLD_LEVEL_IDS[wi]) < w.levels.length);
  const waking = WORLDS.map(
    (w, wi) => wi > 0 && open[wi] && !progress.unlockAll && needsFriendIntro(progress, w.id, WORLD_LEVEL_IDS[wi]),
  );
  return { open, suggested, waking };
}

export function Home({ progress, onFriends, onBedtime, onToday, onTiptoe, onPawn, onGrownUps }: {
  progress: Progress;
  onFriends: () => void;
  onBedtime: () => void;
  onToday: () => void;
  onTiptoe: () => void;
  onPawn: () => void;
  onGrownUps: () => void;
}) {
  return (
    <div className="screen home">
      <div className="hills" aria-hidden="true" />
      <div className="world-grid">
        <FriendsFolder progress={progress} onOpen={onFriends} />
        <BedtimeBubble done={BEDTIME_LEVELS.filter((l) => progress.done.includes(l.id)).length} onOpen={onBedtime} />
        <TiptoeBubble done={TIPTOE_LEVELS.filter((l) => progress.done.includes(l.id)).length} onOpen={onTiptoe} />
        <PawnBubble done={PAWN_LEVELS.filter((l) => progress.done.includes(l.id)).length} onOpen={onPawn} />
        <TodayBubble progress={progress} onOpen={onToday} />
      </div>
      <HoldButton onHeld={onGrownUps} />
    </div>
  );
}

/**
 * The friends folder (like an app drawer): one bubble holding a tiny face for
 * every friend, sleepy until that friend's world opens. Tapping it opens the
 * drawer with every friend world.
 */
function FriendsFolder({ progress, onOpen }: { progress: Progress; onOpen: () => void }) {
  const { open, suggested, waking } = worldStates(progress);
  const news = waking.some(Boolean);
  const finished = WORLDS.map((w, wi) => doneCount(progress, WORLD_LEVEL_IDS[wi]) >= w.levels.length);
  return (
    <button
      className={`world-bubble ${suggested >= 0 || news ? 'suggest' : ''}`}
      onClick={() => { wakeAudio(); sfx.select('king'); onOpen(); }}
      aria-label="Friends"
    >
      <div className={`bubble folder ${news ? 'news' : ''}`}>
        <div className="folder-grid">
          {WORLDS.slice(0, 6).map((w, wi) => (
            <div key={w.id} className={`folder-mini ${open[wi] && !waking[wi] ? '' : 'asleep'}`} style={{ background: w.sky }}>
              <FriendArt kind={w.faces[0]} mood={open[wi] && !waking[wi] ? 'happy' : 'sleepy'} className="fill" />
            </div>
          ))}
        </div>
      </div>
      <div className="bubble-stars">
        {WORLDS.map((w, wi) => <StarIcon key={w.id} filled={finished[wi]} className="mini-star" />)}
      </div>
    </button>
  );
}

/** The opened friends folder: every friend world, and the way back home. */
export function FriendsDrawer({ progress, onOpenWorld, onHome }: {
  progress: Progress;
  onOpenWorld: (worldId: string) => void;
  onHome: () => void;
}) {
  const { open, suggested, waking } = worldStates(progress);
  return (
    <div className="screen home drawer">
      <div className="hills" aria-hidden="true" />
      <div className="topbar">
        <button className="round-btn" onClick={() => { sfx.tap(); onHome(); }} aria-label="Home">
          <HomeIcon className="icon" />
        </button>
        <div className="round-btn-spacer" />
      </div>
      <div className="world-grid drawer-grid">
        {WORLDS.map((w, wi) => (
          <WorldBubble
            key={w.id}
            world={w}
            open={open[wi]}
            bounce={wi === suggested}
            waking={waking[wi]}
            done={doneCount(progress, WORLD_LEVEL_IDS[wi])}
            onOpen={() => onOpenWorld(w.id)}
          />
        ))}
      </div>
    </div>
  );
}

function WorldBubble({ world, open, bounce, waking, done, onOpen }: {
  world: World;
  open: boolean;
  bounce: boolean;
  /** Just woke up and not visited yet: shows the sleeping friend wake up, yawn and wave. */
  waking: boolean;
  done: number;
  onOpen: () => void;
}) {
  const [wobble, setWobble] = useState(0);
  // A newly opened friend is still asleep for a moment, then wakes up.
  const [dozing, setDozing] = useState(waking);
  useEffect(() => {
    if (!waking) return;
    const id = setTimeout(() => { setDozing(false); sfx.wake(); }, 900);
    return () => clearTimeout(id);
  }, [waking]);
  const looksOpen = open && !dozing;
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
      className={`world-bubble ${looksOpen ? '' : 'asleep'} ${bounce && looksOpen ? 'suggest' : ''}`}
      onClick={tap}
      aria-label={open ? `Play with ${world.id}` : `${world.id} is sleeping`}
    >
      <div key={wobble} className={`bubble ${wobble ? 'wobble' : ''}`} style={{ background: world.sky }}>
        {world.faces.map((k, i) => (
          <FriendArt
            key={k}
            kind={k}
            mood={looksOpen ? 'happy' : 'sleepy'}
            className={`${world.faces.length > 1 ? `bubble-friend pair-${i}` : 'bubble-friend'} ${waking && !dozing ? 'waking' : ''}`}
          />
        ))}
      </div>
      <div className="bubble-stars">
        {world.levels.map((l, i) => <StarIcon key={l.id} filled={i < done} className="mini-star" />)}
      </div>
    </button>
  );
}

/** Walk the pawn home: the little pawn racing a gray pawn, under a gold home row. Always open. */
function PawnBubble({ done, onOpen }: { done: number; onOpen: () => void }) {
  return (
    <button
      className="world-bubble"
      onClick={() => { wakeAudio(); sfx.select('pawn'); onOpen(); }}
      aria-label="Pawn walk puzzles"
    >
      <div className="bubble pawn-race" style={{ background: PAWN_SKY }}>
        <FriendArt kind="pawn" colors={GRUMPY} className="bubble-friend pair-0 racer-down" />
        <FriendArt kind="pawn" className="bubble-friend pair-1 racer-up" />
      </div>
      <div className="bubble-stars">
        {PAWN_LEVELS.map((l, i) => <StarIcon key={l.id} filled={i < done} className="mini-star" />)}
      </div>
    </button>
  );
}

/** Tiptoe puzzles: a happy friend sneaking past a sleepy gray guard. Always open. */
function TiptoeBubble({ done, onOpen }: { done: number; onOpen: () => void }) {
  return (
    <button
      className="world-bubble"
      onClick={() => { wakeAudio(); sfx.select('king'); onOpen(); }}
      aria-label="Tiptoe puzzles"
    >
      <div className="bubble" style={{ background: TIPTOE_SKY }}>
        <FriendArt kind="rook" colors={GRUMPY} mood="sleepy" className="bubble-friend pair-0" />
        <FriendArt kind="king" className="bubble-friend pair-1 tiptoe" />
      </div>
      <div className="bubble-stars">
        {TIPTOE_LEVELS.map((l, i) => <StarIcon key={l.id} filled={i < done} className="mini-star" />)}
      </div>
    </button>
  );
}

/** Today's puzzle: always open, a new one every day. */
function TodayBubble({ progress, onOpen }: { progress: Progress; onOpen: () => void }) {
  // Made after the first paint: building a puzzle can take a moment on a slow tablet.
  const [t, setT] = useState<Today | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setT(today()), 60);
    return () => clearTimeout(id);
  }, []);
  const faces = t?.faces ?? [];
  return (
    <button
      className="world-bubble"
      onClick={() => { wakeAudio(); sfx.tap(); onOpen(); }}
      aria-label="Today's puzzle"
    >
      <div className="bubble day">
        <SunIcon className="bubble-sun" />
        {faces.map((k, i) => (
          <FriendArt key={k} kind={k} className={faces.length > 1 ? `bubble-friend pair-${i}` : 'bubble-friend'} />
        ))}
      </div>
      <div className="bubble-stars">
        <SunIcon filled={t !== null && progress.done.includes(t.id)} className="mini-star" />
      </div>
    </button>
  );
}

/** Bedtime puzzles live beside the friend worlds and are always open. */
function BedtimeBubble({ done, onOpen }: { done: number; onOpen: () => void }) {
  return (
    <button
      className="world-bubble"
      onClick={() => { wakeAudio(); sfx.snore(); onOpen(); }}
      aria-label="Bedtime puzzles"
    >
      <div className="bubble night">
        <div className="bubble-moon" />
        {/* Awake and grumpy: on this screen a sleeping face means "not open yet". */}
        <FriendArt kind="king" colors={GRUMPY} mood="grumpy" className="bubble-friend" />
      </div>
      <div className="bubble-stars">
        {BEDTIME_LEVELS.map((l, i) => <StarIcon key={l.id} filled={i < done} className="mini-star" />)}
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

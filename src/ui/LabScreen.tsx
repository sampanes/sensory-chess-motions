// The lab: prototypes of new game ideas, one link away (#/lab), never on the
// kid home screen. A thin grown-up strip in the top bar switches prototypes,
// puzzles and variants, so trying an idea needs no setup at all.
//
// Now in the lab:
//   crossing  (#/lab)        cross with a team. Variants: home spots that say whether
//                            the picked friend can ever land there, the same plus
//                            footprints (how many hops it needs alone), or plain.
//   set up    (#/lab/setup)  put every friend on its starting square of a real board.
//                            Variants: ghosts on the squares to fill, or copy the far side.
//   slime     (#/lab/slime)  the bedtime puzzles with a slime instead of the grumpy king,
//                            explained with magic beams, oozing and a tongue, no words.
//                            Variants: glow (squares light while a friend is held) or beams.
//                            Beams graduated into Bedtime itself (2026-11-24); glow stays here.
//   chase     (#/lab/chase)  the slime moves now: move king and queen (or rooks) one at a
//                            time and corner it, a real endgame (src/core/chase.ts).
//   boss      (#/lab/boss)   a slime boss with a crown for each friend world: a bedtime
//                            puzzle only that world's friend can finish.
// (Tiptoe puzzles and the pawn walk graduated to their own home bubbles.)

import { BEDTIME_LEVELS, BEDTIME_SKY } from '../content/bedtime.ts';
import { BOSS_LEVELS } from '../content/bosses.ts';
import { CHASE_LEVELS, CHASE_SKY } from '../content/chase.ts';
import { WORLDS } from '../content/worlds.ts';
import { ChaseScreen } from './ChaseScreen.tsx';
import { CROSS_LEVELS } from '../content/crossing.ts';
import { SETUP_LEVELS, SETUP_SKY } from '../content/setup.ts';
import { CrossScreen } from './CrossScreen.tsx';
import { SetupScreen } from './SetupScreen.tsx';
import { SlimeScreen, type SlimeVariant } from './SlimeScreen.tsx';

export type LabVariant = 'plain' | 'spots' | 'steps';
export type SetupVariant = 'ghosts' | 'copy';

const VARIANTS: { id: LabVariant; label: string }[] = [
  { id: 'spots', label: 'spots' },
  { id: 'steps', label: 'steps' },
  { id: 'plain', label: 'plain' },
];

const SETUP_VARIANTS: { id: SetupVariant; label: string }[] = [
  { id: 'ghosts', label: 'ghosts' },
  { id: 'copy', label: 'copy' },
];

const SLIME_VARIANTS: { id: SlimeVariant; label: string }[] = [
  { id: 'glow', label: 'glow' },
  { id: 'beams', label: 'beams' },
];

export const LAB_LEVELS = CROSS_LEVELS;
export const LAB_SETUP_LEVELS = SETUP_LEVELS;
export const LAB_SLIME_LEVELS = BEDTIME_LEVELS;
export const LAB_CHASE_LEVELS = CHASE_LEVELS;
export const LAB_BOSS_LEVELS = BOSS_LEVELS;

const home = () => window.location.assign(window.location.pathname);

/** The grown-up strip: which prototype, which puzzle, which variant. */
function Strip<V extends string>({ proto, li, n, variant, variants, go }: {
  proto: 'crossing' | 'setup' | 'slime' | 'chase' | 'boss';
  li: number;
  n: number;
  variant: V;
  variants: { id: V; label: string }[];
  go: (li: number, v: V) => void;
}) {
  return (
    <div className="lab-strip">
      <button className={proto === 'crossing' ? 'on' : ''} onClick={() => { window.location.hash = '#/lab'; }}>crossing</button>
      <button className={proto === 'setup' ? 'on' : ''} onClick={() => { window.location.hash = '#/lab/setup'; }}>set up</button>
      <button className={proto === 'slime' ? 'on' : ''} onClick={() => { window.location.hash = '#/lab/slime'; }}>slime</button>
      <button className={proto === 'chase' ? 'on' : ''} onClick={() => { window.location.hash = '#/lab/chase'; }}>chase</button>
      <button className={proto === 'boss' ? 'on' : ''} onClick={() => { window.location.hash = '#/lab/boss'; }}>boss</button>
      <span className="lab-gap" />
      <button onClick={() => go((li + n - 1) % n, variant)} aria-label="Previous puzzle">&lt;</button>
      <span>{li + 1}/{n}</span>
      <button onClick={() => go((li + 1) % n, variant)} aria-label="Next puzzle">&gt;</button>
      <span className="lab-gap" />
      {variants.map((v) => (
        <button key={v.id} className={v.id === variant ? 'on' : ''} onClick={() => go(li, v.id)}>
          {v.label}
        </button>
      ))}
    </div>
  );
}

export function LabScreen({ li, variant, go }: { li: number; variant: LabVariant; go: (li: number, v: LabVariant) => void }) {
  const n = LAB_LEVELS.length;
  const level = LAB_LEVELS[li];
  return (
    <CrossScreen
      key={`${level.id}-${variant}`}
      grid={level.grid}
      spots={variant !== 'plain'}
      steps={variant === 'steps'}
      eagerHint={li === 0}
      top={<Strip proto="crossing" li={li} n={n} variant={variant} variants={VARIANTS} go={go} />}
      onNext={() => go((li + 1) % n, variant)}
      onHome={home}
    />
  );
}

export function LabSetupScreen({ li, variant, go }: { li: number; variant: SetupVariant; go: (li: number, v: SetupVariant) => void }) {
  const n = LAB_SETUP_LEVELS.length;
  const level = LAB_SETUP_LEVELS[li];
  return (
    <SetupScreen
      key={`${level.id}-${variant}`}
      level={level}
      seed={li + 1}
      ghosts={variant === 'ghosts'}
      sky={SETUP_SKY}
      eagerHint={li === 0}
      top={<Strip proto="setup" li={li} n={n} variant={variant} variants={SETUP_VARIANTS} go={go} />}
      onNext={() => go((li + 1) % n, variant)}
      onHome={home}
    />
  );
}

export function LabSlimeScreen({ li, variant, go }: { li: number; variant: SlimeVariant; go: (li: number, v: SlimeVariant) => void }) {
  const n = LAB_SLIME_LEVELS.length;
  const level = LAB_SLIME_LEVELS[li];
  return (
    <SlimeScreen
      key={`${level.id}-${variant}`}
      grid={level.grid}
      tray={level.tray}
      sky={BEDTIME_SKY}
      variant={variant}
      eagerHint={li === 0}
      top={<Strip proto="slime" li={li} n={n} variant={variant} variants={SLIME_VARIANTS} go={go} />}
      onNext={() => go((li + 1) % n, variant)}
      onHome={home}
    />
  );
}

export function LabChaseScreen({ li, go }: { li: number; go: (li: number) => void }) {
  const n = LAB_CHASE_LEVELS.length;
  const level = LAB_CHASE_LEVELS[li];
  return (
    <ChaseScreen
      key={level.id}
      grid={level.grid}
      sky={CHASE_SKY}
      eagerHint={li === 0}
      top={<Strip proto="chase" li={li} n={n} variant="" variants={[]} go={(l) => go(l)} />}
      onNext={() => go((li + 1) % n)}
      onHome={home}
    />
  );
}

export function LabBossScreen({ li, go }: { li: number; go: (li: number) => void }) {
  const n = LAB_BOSS_LEVELS.length;
  const level = LAB_BOSS_LEVELS[li];
  const sky = WORLDS.find((w) => w.id === level.world)?.sky ?? BEDTIME_SKY;
  return (
    <SlimeScreen
      key={level.id}
      grid={level.grid}
      tray={level.tray}
      sky={sky}
      variant="beams"
      boss
      top={<Strip proto="boss" li={li} n={n} variant="" variants={[]} go={(l) => go(l)} />}
      onNext={() => go((li + 1) % n)}
      onHome={home}
    />
  );
}

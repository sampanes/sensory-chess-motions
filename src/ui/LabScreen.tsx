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
// (Tiptoe puzzles and the pawn walk graduated to their own home bubbles.)

import { CROSS_LEVELS } from '../content/crossing.ts';
import { SETUP_LEVELS, SETUP_SKY } from '../content/setup.ts';
import { CrossScreen } from './CrossScreen.tsx';
import { SetupScreen } from './SetupScreen.tsx';

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

export const LAB_LEVELS = CROSS_LEVELS;
export const LAB_SETUP_LEVELS = SETUP_LEVELS;

const home = () => window.location.assign(window.location.pathname);

/** The grown-up strip: which prototype, which puzzle, which variant. */
function Strip<V extends string>({ proto, li, n, variant, variants, go }: {
  proto: 'crossing' | 'setup';
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

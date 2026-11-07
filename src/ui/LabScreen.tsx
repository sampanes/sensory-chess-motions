// The lab: prototypes of new game ideas, one link away (#/lab), never on the
// kid home screen. A thin grown-up strip in the top bar switches puzzles and
// compares variants, so trying an idea needs no setup at all.
//
// Now in the lab: cross with a team. Variants: home spots that say whether
// the picked friend can ever land there, or plain.
// (Tiptoe puzzles and the pawn walk graduated to their own home bubbles.)

import { CROSS_LEVELS } from '../content/crossing.ts';
import { CrossScreen } from './CrossScreen.tsx';

export type LabVariant = 'plain' | 'spots';

const VARIANTS: { id: LabVariant; label: string }[] = [
  { id: 'spots', label: 'spots' },
  { id: 'plain', label: 'plain' },
];

export const LAB_LEVELS = CROSS_LEVELS;

export function LabScreen({ li, variant, go }: { li: number; variant: LabVariant; go: (li: number, v: LabVariant) => void }) {
  const n = LAB_LEVELS.length;
  const level = LAB_LEVELS[li];
  const strip = (
    <div className="lab-strip">
      <button onClick={() => go((li + n - 1) % n, variant)} aria-label="Previous puzzle">&lt;</button>
      <span>{li + 1}/{n}</span>
      <button onClick={() => go((li + 1) % n, variant)} aria-label="Next puzzle">&gt;</button>
      <span className="lab-gap" />
      {VARIANTS.map((v) => (
        <button key={v.id} className={v.id === variant ? 'on' : ''} onClick={() => go(li, v.id)}>
          {v.label}
        </button>
      ))}
    </div>
  );
  return (
    <CrossScreen
      key={`${level.id}-${variant}`}
      grid={level.grid}
      spots={variant === 'spots'}
      eagerHint={li === 0}
      top={strip}
      onNext={() => go((li + 1) % n, variant)}
      onHome={() => window.location.assign(window.location.pathname)}
    />
  );
}

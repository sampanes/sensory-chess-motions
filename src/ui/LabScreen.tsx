// The lab: prototypes of new game ideas, one link away (#/lab), never on the
// kid home screen. A thin grown-up strip in the top bar switches puzzles and
// compares variants, so trying an idea needs no setup at all.
//
// Now in the lab: walk the pawn home. (Tiptoe puzzles graduated to their own
// home bubble, #/tiptoe.)

import { PAWN_LEVELS, PAWN_RULES, PAWN_SKY } from '../content/pawnwalk.ts';
import { TiptoeScreen, type Peek } from './TiptoeScreen.tsx';

const PEEKS: { id: Peek; label: string }[] = [
  { id: 'never', label: 'surprise' },
  { id: 'dots', label: 'warn hops' },
  { id: 'always', label: 'show all' },
];

export const LAB_LEVELS = PAWN_LEVELS;

export function LabScreen({ li, peek, go }: { li: number; peek: Peek; go: (li: number, peek: Peek) => void }) {
  const n = LAB_LEVELS.length;
  const level = LAB_LEVELS[li];
  const strip = (
    <div className="lab-strip">
      <button onClick={() => go((li + n - 1) % n, peek)} aria-label="Previous puzzle">&lt;</button>
      <span>{li + 1}/{n}</span>
      <button onClick={() => go((li + 1) % n, peek)} aria-label="Next puzzle">&gt;</button>
      <span className="lab-gap" />
      {PEEKS.map((p) => (
        <button key={p.id} className={p.id === peek ? 'on' : ''} onClick={() => go(li, p.id)}>
          {p.label}
        </button>
      ))}
    </div>
  );
  return (
    <TiptoeScreen
      key={`${level.id}-${peek}`}
      grid={level.grid}
      rules={PAWN_RULES(level)}
      sky={PAWN_SKY}
      peek={peek}
      eagerHint={li === 0}
      top={strip}
      onNext={() => go((li + 1) % n, peek)}
      onHome={() => window.location.assign(window.location.pathname)}
    />
  );
}

// The slime (lab prototype, #/lab/slime): the bedtime puzzles with a wobbly slime
// in the grumpy king's place. Body, goo and sparkle are traced from
// art/sheets/08-slime.png (src/ui/slimeArt.ts); the face is drawn here, so it can
// change mood, like the friends' faces.

import { SLIME_PATHS } from './slimeArt.ts';

export type SlimeMood = 'idle' | 'scared' | 'hit' | 'smug' | 'nyah';

export const SLIME = { fill: '#a3e635', dark: '#3f6212', light: '#ecfccb' };
const INK = '#1f2937';

function Eyes({ mood }: { mood: SlimeMood }) {
  if (mood === 'hit') {
    // squeezed shut: > <
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M33 45 L41 50 L33 55" />
        <path d="M67 45 L59 50 L67 55" />
      </g>
    );
  }
  if (mood === 'scared') {
    // wide eyes, tiny pupils, worried brows, a sweat drop
    return (
      <g>
        {[39, 61].map((x) => (
          <g key={x}>
            <circle cx={x} cy={50} r={10} fill="#fff" stroke={SLIME.dark} strokeWidth={2} />
            <circle cx={x} cy={50} r={2.8} fill={INK} />
          </g>
        ))}
        <g stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M30 39 Q37 36 45 33" />
          <path d="M70 39 Q63 36 55 33" />
        </g>
        <path d="M78 30 Q74 37 78 40 Q82 37 78 30 Z" fill="#7dd3fc" stroke="#0369a1" strokeWidth={1.5} />
      </g>
    );
  }
  if (mood === 'nyah') {
    // happy closed arcs
    return (
      <g stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none">
        <path d="M32 52 Q38 44 44 52" />
        <path d="M56 52 Q62 44 68 52" />
      </g>
    );
  }
  return (
    <g>
      {[39, 61].map((x) => (
        <g key={x}>
          <circle cx={x} cy={49} r={9} fill="#fff" stroke={SLIME.dark} strokeWidth={2} />
          <circle cx={x + (mood === 'smug' ? 2.5 : 1)} cy={mood === 'smug' ? 51 : 50} r={4.2} fill={INK} />
          <circle cx={x + 2.5} cy={47} r={1.4} fill="#fff" />
          {mood === 'smug' && <path d={`M${x - 9} 46 Q${x} 41 ${x + 9} 46`} stroke={SLIME.dark} strokeWidth={3} fill={SLIME.fill} />}
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood }: { mood: SlimeMood }) {
  switch (mood) {
    case 'hit':
      return <ellipse cx={50} cy={68} rx={4.5} ry={5.5} fill={INK} />;
    case 'scared':
      return <path d="M40 70 Q45 65 50 70 Q55 75 60 70" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
    case 'smug':
      return <path d="M38 64 Q50 76 63 63" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
    case 'nyah':
      return (
        <g>
          <path d="M38 63 Q50 74 62 63 Z" fill={INK} />
          <path d="M44 67 Q44 80 50 80 Q56 80 56 67 Z" fill="#f472b6" stroke="#be185d" strokeWidth={2} />
          <path d="M50 69 L50 76" stroke="#be185d" strokeWidth={1.5} />
        </g>
      );
    default:
      return <path d="M42 65 Q50 71 58 65" stroke={INK} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
  }
}

function Paths({ name }: { name: string }) {
  return (
    <>
      {SLIME_PATHS[name].map(([fill, d], k) => (
        <path key={k} d={d} fill={fill} />
      ))}
    </>
  );
}

export function SlimeArt({ mood = 'idle', className }: { mood?: SlimeMood; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx={50} cy={86} rx={34} ry={5} fill="rgba(0,0,0,0.15)" />
      <Paths name="body" />
      {/* The face fits the plain middle of the dome: clear of the shine, the bubbles and the drips. */}
      <g transform="translate(50 46) scale(0.9) translate(-50 -50)">
        <Eyes mood={mood} />
        <Mouth mood={mood} />
      </g>
    </svg>
  );
}

/** Goo dripping over a friend the slime got. */
export function GooCover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <Paths name="goo" />
    </svg>
  );
}

/** A four-point sparkle, for magic landing on a square. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <Paths name="sparkle" />
    </svg>
  );
}

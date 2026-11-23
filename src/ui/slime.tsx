// The slime (lab prototype, #/lab/slime): the bedtime puzzles with a wobbly slime
// in the grumpy king's place. Drawn here in code until it earns an art sheet.

export type SlimeMood = 'idle' | 'hit' | 'smug' | 'nyah';

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

export function SlimeArt({ mood = 'idle', className }: { mood?: SlimeMood; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx={50} cy={89} rx={36} ry={5} fill="rgba(0,0,0,0.15)" />
      <path
        d="M12 84 C8 70 14 57 25 51 C26 31 37 19 50 19 C63 19 74 31 75 51 C86 57 92 70 88 84 C81 90 72 85 66 88 C59 92 42 92 35 88 C28 85 19 90 12 84 Z"
        fill={SLIME.fill}
        stroke={SLIME.dark}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <path d="M33 33 Q39 26 47 25" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.65} fill="none" />
      <circle cx={74} cy={70} r={3.2} fill={SLIME.light} opacity={0.8} />
      <circle cx={24} cy={74} r={2.2} fill={SLIME.light} opacity={0.8} />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </svg>
  );
}

/** Goo dripping over a friend the slime got. */
export function GooCover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path
        d="M14 30 C20 14 80 14 86 30 L86 58 Q82 70 78 58 L76 50 Q72 78 66 52 Q60 44 56 66 Q52 82 48 60 Q44 46 40 56 Q36 70 32 52 Q28 44 24 62 Q20 72 16 56 Z"
        fill={SLIME.fill}
        stroke={SLIME.dark}
        strokeWidth={3}
        strokeLinejoin="round"
        opacity={0.92}
      />
    </svg>
  );
}

/** A four-point sparkle, for magic landing on a square. */
export function Sparkle({ className, color = '#fde047' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 8 Q56 44 92 50 Q56 56 50 92 Q44 56 8 50 Q44 44 50 8 Z" fill={color} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
      <circle cx={80} cy={22} r={6} fill="#fff" />
      <circle cx={22} cy={78} r={4} fill="#fff" />
    </svg>
  );
}

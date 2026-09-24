// All artwork is inline SVG so it stays crisp at any size and needs no files.
// Friends are real chess-piece shapes with faces: kids meet "the one with the
// crown" and later recognize the same shape on a real board.

import type { Kind } from '../core/types.ts';
import type { TreatKind } from '../content/worlds.ts';

export const PALETTE: Record<Kind, { fill: string; dark: string }> = {
  king: { fill: '#fcd34d', dark: '#b45309' },
  queen: { fill: '#f9a8d4', dark: '#be185d' },
  rook: { fill: '#93c5fd', dark: '#1d4ed8' },
  bishop: { fill: '#c4b5fd', dark: '#6d28d9' },
  knight: { fill: '#fdba74', dark: '#c2410c' },
  pawn: { fill: '#86efac', dark: '#15803d' },
};

export type Mood = 'happy' | 'sleepy' | 'wow';

const INK = '#1f2937';

function Eyes({ mood, cx = [43, 57], cy = 60 }: { mood: Mood; cx?: number[]; cy?: number }) {
  if (mood === 'sleepy') {
    return (
      <g stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round">
        {cx.map((x) => <path key={x} d={`M${x - 4} ${cy} Q${x} ${cy + 3.5} ${x + 4} ${cy}`} />)}
      </g>
    );
  }
  return (
    <g className="blink">
      {cx.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={cy} rx={3.6} ry={mood === 'wow' ? 4.8 : 4.2} fill={INK} />
          <circle cx={x + 1.2} cy={cy - 1.6} r={1.3} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

function Mouth({ mood, x = 50, y = 67 }: { mood: Mood; x?: number; y?: number }) {
  if (mood === 'wow') return <ellipse cx={x} cy={y + 2} rx={4} ry={4.5} fill={INK} />;
  if (mood === 'sleepy') return <circle cx={x} cy={y + 2} r={2} fill={INK} />;
  return (
    <path d={`M${x - 5} ${y} Q${x} ${y + 5.5} ${x + 5} ${y}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
  );
}

function Cheeks({ at = [[38, 67], [62, 67]] }: { at?: number[][] }) {
  return (
    <g fill="#fb7185" opacity={0.45}>
      {at.map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx={4} ry={2.6} />)}
    </g>
  );
}

const BODY = 'M30 90 Q25 90 27 84 Q30 76 37 72 Q34 58 37 46 H63 Q66 58 63 72 Q70 76 73 84 Q75 90 70 90 Z';

function Top({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'king':
      return (
        <>
          <rect x={46} y={5} width={8} height={24} rx={3} />
          <rect x={39} y={10} width={22} height={8} rx={3} />
          <path d="M34 47 Q30 31 42 27 Q50 23 58 27 Q70 31 66 47 Z" />
        </>
      );
    case 'queen':
      return (
        <>
          <path d="M33 47 L28 22 L40 33 L50 16 L60 33 L72 22 L67 47 Z" />
          <circle cx={28} cy={19} r={5} />
          <circle cx={50} cy={12} r={5} />
          <circle cx={72} cy={19} r={5} />
        </>
      );
    case 'rook':
      return <path d="M33 47 V18 H41 V26 H46 V18 H54 V26 H59 V18 H67 V47 Z" />;
    case 'bishop':
      return (
        <>
          <circle cx={50} cy={9} r={5} />
          <path d="M38 47 Q28 32 44 18 L50 13 L56 18 Q72 32 62 47 Z" />
          <path d="M57 24 L48 36" fill="none" strokeWidth={3.5} strokeLinecap="round" />
        </>
      );
    case 'pawn':
      return <circle cx={50} cy={30} r={15} />;
    case 'knight':
      return (
        <path d="M37 47 L40 39 Q29 41 23 36 Q18 30 24 24 L38 12 L39 4 L47 10 Q65 10 67 30 Q68 40 64 47 Z" />
      );
  }
}

export function FriendArt({ kind, mood = 'happy', className }: { kind: Kind; mood?: Mood; className?: string }) {
  const { fill, dark } = PALETTE[kind];
  const knight = kind === 'knight';
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx={50} cy={93} rx={25} ry={4.5} fill="rgba(0,0,0,0.15)" />
      <g fill={fill} stroke={dark} strokeWidth={3} strokeLinejoin="round">
        <Top kind={kind} />
        <path d={BODY} />
        <ellipse cx={50} cy={47} rx={17} ry={5} />
      </g>
      {knight ? (
        <>
          <Eyes mood={mood} cx={[42]} cy={22} />
          <circle cx={27} cy={30} r={1.8} fill={dark} />
          <path d="M47 11 Q60 16 62 32" stroke={dark} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.6} />
          <Mouth mood={mood} x={32} y={35} />
          <Cheeks at={[[50, 64]]} />
        </>
      ) : (
        <>
          <Eyes mood={mood} />
          <Mouth mood={mood} />
          <Cheeks />
        </>
      )}
      {mood === 'sleepy' && (
        <g fill="#64748b" fontFamily="system-ui, sans-serif" fontWeight={800}>
          <text x={74} y={30} fontSize={14}>z</text>
          <text x={84} y={18} fontSize={10}>z</text>
        </g>
      )}
    </svg>
  );
}

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export const TREAT_COLOR: Record<TreatKind, string> = {
  berry: '#ef4444',
  star: '#facc15',
  carrot: '#f97316',
  cupcake: '#f9a8d4',
  apple: '#f87171',
  candy: '#a78bfa',
  cookie: '#d6a064',
};

export function TreatArt({ kind, className }: { kind: TreatKind; className?: string }) {
  let body;
  switch (kind) {
    case 'berry':
      body = (
        <>
          <path d="M50 88 Q22 70 24 46 Q26 32 50 34 Q74 32 76 46 Q78 70 50 88 Z" fill="#ef4444" stroke="#991b1b" strokeWidth={3} />
          <g fill="#fde68a">
            <ellipse cx={40} cy={50} rx={2} ry={3} /><ellipse cx={58} cy={48} rx={2} ry={3} />
            <ellipse cx={48} cy={62} rx={2} ry={3} /><ellipse cx={62} cy={64} rx={2} ry={3} />
            <ellipse cx={38} cy={66} rx={2} ry={3} /><ellipse cx={50} cy={76} rx={2} ry={3} />
          </g>
          <path d="M50 36 L36 24 L47 29 L50 16 L53 29 L64 24 Z" fill="#22c55e" stroke="#15803d" strokeWidth={2.5} strokeLinejoin="round" />
        </>
      );
      break;
    case 'star':
      body = <polygon points={starPoints(50, 54, 40, 18)} fill="#facc15" stroke="#ca8a04" strokeWidth={3.5} strokeLinejoin="round" />;
      break;
    case 'carrot':
      body = (
        <>
          <path d="M52 32 Q52 12 60 7 Q60 20 58 32 Z M56 34 Q70 18 82 20 Q72 28 62 38 Z" fill="#22c55e" stroke="#15803d" strokeWidth={2.5} strokeLinejoin="round" />
          <path d="M34 36 Q48 24 66 38 L38 88 Q33 91 31 85 Z" fill="#f97316" stroke="#c2410c" strokeWidth={3} strokeLinejoin="round" />
          <path d="M42 50 L50 53 M38 64 L45 66 M50 44 L57 47" stroke="#c2410c" strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
      break;
    case 'cupcake':
      body = (
        <>
          <path d="M28 56 H72 L64 88 H36 Z" fill="#60a5fa" stroke="#1d4ed8" strokeWidth={3} strokeLinejoin="round" />
          <path d="M42 58 L45 86 M58 58 L55 86" stroke="#1d4ed8" strokeWidth={2} opacity={0.5} />
          <path d="M24 58 Q20 44 35 42 Q38 26 50 28 Q62 26 65 42 Q80 44 76 58 Z" fill="#fbcfe8" stroke="#db2777" strokeWidth={3} strokeLinejoin="round" />
          <circle cx={50} cy={22} r={7} fill="#ef4444" stroke="#991b1b" strokeWidth={2.5} />
        </>
      );
      break;
    case 'apple':
      body = (
        <>
          <path d="M50 36 Q30 22 22 46 Q18 72 40 86 Q50 90 60 86 Q82 72 78 46 Q70 22 50 36 Z" fill="#f87171" stroke="#b91c1c" strokeWidth={3} />
          <path d="M50 36 Q50 24 54 16" stroke="#78350f" strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M55 24 Q66 14 74 20 Q66 30 55 24 Z" fill="#22c55e" stroke="#15803d" strokeWidth={2.5} />
          <ellipse cx={36} cy={52} rx={5} ry={8} fill="#fff" opacity={0.45} />
        </>
      );
      break;
    case 'candy':
      body = (
        <>
          <path d="M30 50 L12 36 L14 64 Z M70 50 L88 36 L86 64 Z" fill="#c4b5fd" stroke="#6d28d9" strokeWidth={3} strokeLinejoin="round" />
          <circle cx={50} cy={50} r={22} fill="#a78bfa" stroke="#6d28d9" strokeWidth={3} />
          <path d="M40 42 Q50 34 60 44 Q62 56 50 58 Q42 58 44 50" stroke="#fff" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case 'cookie':
      body = (
        <>
          <circle cx={50} cy={52} r={34} fill="#d6a064" stroke="#92400e" strokeWidth={3} />
          <g fill="#5b3a1a">
            <circle cx={38} cy={42} r={4.5} /><circle cx={60} cy={38} r={4} /><circle cx={52} cy={58} r={5} />
            <circle cx={36} cy={64} r={3.5} /><circle cx={66} cy={62} r={4} />
          </g>
        </>
      );
      break;
  }
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {body}
    </svg>
  );
}

export function RockArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx={50} cy={86} rx={36} ry={5} fill="rgba(0,0,0,0.15)" />
      <path d="M16 78 Q12 60 28 50 Q36 30 56 32 Q76 34 83 56 Q90 76 72 83 Q48 90 16 78 Z" fill="#a8a29e" stroke="#57534e" strokeWidth={3} strokeLinejoin="round" />
      <path d="M36 44 Q46 38 56 40" stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.5} fill="none" />
      <path d="M22 72 Q30 62 42 68 Q36 76 22 72 Z" fill="#84cc16" opacity={0.8} />
    </svg>
  );
}

// ---- Icons (no words anywhere for the kids) --------------------------------

type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M8 22 L24 8 L40 22 V40 H30 V29 H18 V40 H8 Z" fill="#fff" stroke="#334155" strokeWidth={3.5} strokeLinejoin="round" />
      <rect x={20} y={30} width={8} height={10} fill="#f59e0b" />
    </svg>
  );
}

export function GoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M16 10 L38 24 L16 38 Z" fill="#fff" stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
    </svg>
  );
}

export function AgainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M36 16 A14 14 0 1 0 38 28" fill="none" stroke="#334155" strokeWidth={4.5} strokeLinecap="round" />
      <path d="M30 8 L38 17 L27 20 Z" fill="#334155" stroke="#334155" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <g fill="#64748b">
        {[0, 45, 90, 135].map((a) => (
          <rect key={a} x={21} y={6} width={6} height={36} rx={2} transform={`rotate(${a} 24 24)`} />
        ))}
      </g>
      <circle cx={24} cy={24} r={11} fill="#64748b" />
      <circle cx={24} cy={24} r={5} fill="#f1f5f9" />
    </svg>
  );
}

export function StarIcon({ className, filled = true }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <polygon
        points={starPoints(50, 54, 44, 20)}
        fill={filled ? '#facc15' : 'rgba(255,255,255,0.6)'}
        stroke={filled ? '#ca8a04' : '#cbd5e1'}
        strokeWidth={6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HandIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        d="M19 6 Q23 6 23 10 V22 L25 22 V18 Q25 15 28 15 Q31 15 31 18 V23 L32 23 V20 Q32 17 35 17 Q38 17 38 20 V25 L39 25 V23 Q39 20 41.5 20 Q44 20 44 23 V33 Q44 44 32 44 H27 Q20 44 16 37 L9 27 Q7 24 10 22 Q13 20 15 23 L15 26 V10 Q15 6 19 6 Z"
        fill="#fff"
        stroke="#334155"
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
    </svg>
  );
}

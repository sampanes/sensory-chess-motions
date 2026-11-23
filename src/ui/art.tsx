// All artwork is inline SVG so it stays crisp at any size and needs no files.
// Friends are real chess-piece shapes with faces: kids meet "the one with the
// crown" and later recognize the same shape on a real board. Their bodies are
// traced from drawn art (friendBodies.ts, baked by scripts/bake-art.py);
// their faces are drawn here, so they blink and change mood.

import type { Kind } from '../core/types.ts';
import type { TreatKind } from '../content/worlds.ts';
import { FRIEND_BODIES, type BodyRole } from './friendBodies.ts';
import { ROCK_PATHS } from './rockArt.ts';
import { TREAT_PATHS } from './treatArt.ts';

export const PALETTE: Record<Kind, { fill: string; dark: string }> = {
  king: { fill: '#fcd34d', dark: '#b45309' },
  queen: { fill: '#f9a8d4', dark: '#be185d' },
  rook: { fill: '#93c5fd', dark: '#1d4ed8' },
  bishop: { fill: '#c4b5fd', dark: '#6d28d9' },
  knight: { fill: '#fdba74', dark: '#c2410c' },
  pawn: { fill: '#86efac', dark: '#15803d' },
};

export type Mood = 'happy' | 'sleepy' | 'wow' | 'grumpy';

/** The grumpy king of the bedtime puzzles: night-time colors, never a friend's. */
export const GRUMPY = { fill: '#cbd5e1', dark: '#475569' };

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
    <>
      <g className="blink">
        {cx.map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={cy} rx={3.6} ry={mood === 'wow' ? 4.8 : 4.2} fill={INK} />
            <circle cx={x + 1.2} cy={cy - 1.6} r={1.3} fill="#fff" />
          </g>
        ))}
      </g>
      {mood === 'grumpy' && (
        <g stroke={INK} strokeWidth={2.6} strokeLinecap="round">
          {cx.map((x, i) => (
            <path key={x} d={i === 0 ? `M${x - 5} ${cy - 9} L${x + 4} ${cy - 6}` : `M${x - 4} ${cy - 6} L${x + 5} ${cy - 9}`} />
          ))}
        </g>
      )}
    </>
  );
}

function Mouth({ mood, x = 50, y = 67 }: { mood: Mood; x?: number; y?: number }) {
  if (mood === 'wow') return <ellipse cx={x} cy={y + 2} rx={4} ry={4.5} fill={INK} />;
  if (mood === 'sleepy') return <circle cx={x} cy={y + 2} r={2} fill={INK} />;
  if (mood === 'grumpy') {
    return <path d={`M${x - 5} ${y + 3} Q${x} ${y - 2} ${x + 5} ${y + 3}`} stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />;
  }
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

/** Halfway between two colors (the knight's mane, between his two). */
function mix(a: string, b: string): string {
  const ch = (c: string, i: number) => parseInt(c.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round((ch(a, i) + ch(b, i)) / 2).toString(16).padStart(2, '0')).join('');
}

/**
 * Where each friend's face goes on its body (in the 0..100 box), and how big:
 * on the round head under the crown, as in the art. The face is drawn at
 * FACE_MID and moved here, so all four moods and the blink stay code.
 */
const FACE_AT: Record<Exclude<Kind, 'knight'>, { x: number; y: number; s: number }> = {
  king: { x: 50, y: 46, s: 0.95 },
  queen: { x: 50, y: 46, s: 0.95 },
  rook: { x: 50, y: 46, s: 0.95 },
  bishop: { x: 50, y: 46.5, s: 0.95 },
  pawn: { x: 50, y: 37, s: 1.05 },
};
const FACE_MID = { x: 50, y: 63 };

export function FriendArt({ kind, mood = 'happy', className, colors }: {
  kind: Kind;
  mood?: Mood;
  className?: string;
  /** Override the friend's own colors (the grumpy king, the gray side, ivory). */
  colors?: { fill: string; dark: string };
}) {
  const { fill, dark } = colors ?? PALETTE[kind];
  const paint: Record<BodyRole, string> = { fill, dark, shade: mix(fill, dark), ruby: '#ef4444', sapphire: '#3b82f6' };
  const at = kind === 'knight' ? null : FACE_AT[kind];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx={50} cy={92} rx={25} ry={4.5} fill="rgba(0,0,0,0.15)" />
      {FRIEND_BODIES[kind].map(([role, d], i) => <path key={i} d={d} fill={paint[role]} />)}
      {at ? (
        <g transform={`translate(${at.x} ${at.y}) scale(${at.s}) translate(${-FACE_MID.x} ${-FACE_MID.y})`}>
          <Eyes mood={mood} />
          <Mouth mood={mood} />
          <Cheeks />
        </g>
      ) : (
        <g transform="translate(44 31) scale(1.05) translate(-44 -31)">
          {/* The knight in profile: one eye, a nostril at the snout, a smile along the jaw. */}
          <Eyes mood={mood} cx={[44]} cy={31} />
          <circle cx={30} cy={41} r={1.8} fill={dark} />
          <Mouth mood={mood} x={37} y={44} />
          <Cheeks at={[[51, 39]]} />
        </g>
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

// Treats are traced from art/sheets/03-treats.png (src/ui/treatArt.ts).
export function TreatArt({ kind, className }: { kind: TreatKind; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {TREAT_PATHS[kind].map(([fill, d], k) => (
        <path key={k} d={d} fill={fill} />
      ))}
    </svg>
  );
}

// One of three rocks (traced from art/sheets/04-rocks.png), picked by the square, so a
// board with several does not look stamped. `at` is the square; leave it out for the moss one.
const ROCK_ORDER = ['plain', 'moss', 'crack'] as const;

export function rockFor(at: number): (typeof ROCK_ORDER)[number] {
  let h = Math.imul(at ^ 0x5bd1e995, 0x85ebca6b); // a small hash: neighbors look unrelated
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ROCK_ORDER[(h >>> 0) % 3];
}

export function RockArt({ className, at }: { className?: string; at?: number }) {
  const parts = ROCK_PATHS[at === undefined ? 'moss' : rockFor(at)];
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {parts.map(([fill, d], k) => (
        <path key={k} d={d} fill={fill} />
      ))}
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

/** A little sun: today's puzzle, filled once it is done. */
export function SunIcon({ className, filled = true }: IconProps & { filled?: boolean }) {
  const fill = filled ? '#fbbf24' : 'rgba(255,255,255,0.6)';
  const stroke = filled ? '#d97706' : '#cbd5e1';
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={i}
          x1={50}
          y1={8}
          x2={50}
          y2={22}
          stroke={stroke}
          strokeWidth={7}
          strokeLinecap="round"
          transform={`rotate(${i * 45} 50 50)`}
        />
      ))}
      <circle cx={50} cy={50} r={22} fill={fill} stroke={stroke} strokeWidth={6} />
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

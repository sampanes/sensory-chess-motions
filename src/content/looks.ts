// Replays stay lively: a puzzle played again gets a surprise treat, board
// colors and music. The first time, a puzzle always looks like its world, so
// a friend and its treat stay linked while the kid is meeting them.
//
// Every board theme keeps the same light/dark contrast as the meadow, so the
// hop dots, rocks and friends read the same on all of them.

import type { TreatKind } from './worlds.ts';

export interface BoardTheme {
  id: string;
  light: string;
  dark: string;
  /** The board's frame, and its shadow. */
  rim: string;
  rimDark: string;
  /** Screen background behind the board ('' = the world's own sky). */
  sky: string;
}

export const MEADOW: BoardTheme = { id: 'meadow', light: '#eaf7d8', dark: '#bfe6a4', rim: '#7cb65a', rimDark: '#5d9442', sky: '' };

/**
 * The high-contrast board (a grown-up toggle, src/ui/senses.ts): white and
 * slate squares in a near-black frame. It replaces whatever theme a puzzle
 * would have had, so it is not one of the surprise themes below.
 */
export const HIGH_CONTRAST: BoardTheme = { id: 'contrast', light: '#ffffff', dark: '#9fb0c8', rim: '#0f172a', rimDark: '#000000', sky: '' };

/**
 * A real wooden chessboard, and the ivory of a real set's light pieces. The
 * set-up puzzle ends on these: the meadow turns to wood and the friends dress
 * up as the pieces they are (keeping their faces). Not a surprise theme.
 */
export const WOOD: BoardTheme = { id: 'wood', light: '#f0d9b5', dark: '#b58863', rim: '#7a5230', rimDark: '#553820', sky: '' };
export const IVORY = { fill: '#fffdf3', dark: '#3f3a36' } as const;

export const BOARD_THEMES: readonly BoardTheme[] = [
  MEADOW,
  { id: 'beach', light: '#fdf4dc', dark: '#f1dca4', rim: '#d9b26a', rimDark: '#b48c45', sky: '#dff3fb' },
  { id: 'snow', light: '#f4f8fc', dark: '#cfe0f0', rim: '#8fb3d6', rimDark: '#6a8fb5', sky: '#e7eef8' },
  { id: 'autumn', light: '#fdecd6', dark: '#f4c895', rim: '#d9935a', rimDark: '#b5703a', sky: '#fdf2e4' },
  { id: 'blossom', light: '#fdf0f6', dark: '#f5cde0', rim: '#e08fb3', rimDark: '#bd6a90', sky: '#fbeef4' },
  { id: 'lagoon', light: '#e3f6f4', dark: '#a9e0d8', rim: '#5fb8ab', rimDark: '#3f978b', sky: '#e6f4f8' },
  { id: 'lavender', light: '#f1edfb', dark: '#d3c8f2', rim: '#a08ad9', rimDark: '#7d67b8', sky: '#f3effa' },
];

/**
 * A color part way (t from 0 to 1) from a to b, turning through hue rather
 * than straight across: green grass turns golden on its way to wood instead
 * of going muddy olive.
 */
function blend(a: string, b: string, t: number): string {
  const [h1, s1, l1] = toHsl(a);
  const [h2, s2, l2] = toHsl(b);
  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return fromHsl((h1 + dh * t + 360) % 360, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t);
}

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [0, 8, 4].map((n) => Math.round(f(n) * 255).toString(16).padStart(2, '0')).join('');
}

/**
 * The board reveal (milestone 5): the last friend world is the bridge to a
 * real chess set, so on a first play its meadow turns, puzzle by puzzle, into
 * the wooden board. Puzzle 1 is pure meadow, the last one is pure wood. A
 * replay still rolls a surprise theme.
 */
export const REVEAL_WORLD = 'friends';

/** The board between the meadow (t = 0) and the wooden board (t = 1). */
export function revealBoard(t: number): BoardTheme {
  const k = Math.min(1, Math.max(0, t));
  if (k === 0) return MEADOW;
  if (k === 1) return WOOD;
  const mix = (key: 'light' | 'dark' | 'rim' | 'rimDark') => blend(MEADOW[key], WOOD[key], k);
  return { id: `reveal-${Math.round(k * 100)}`, light: mix('light'), dark: mix('dark'), rim: mix('rim'), rimDark: mix('rimDark'), sky: '' };
}

/** The board a puzzle shows on its first play: the meadow, except in the reveal world. */
export function firstBoard(worldId: string, levelIndex: number, levelCount: number): BoardTheme {
  if (worldId !== REVEAL_WORLD || levelCount < 2) return MEADOW;
  return revealBoard(levelIndex / (levelCount - 1));
}

/** How the munch notes and the win tune sound. */
export interface Music {
  /** Semitones up (or down) from C major pentatonic. */
  key: number;
  voice: 'triangle' | 'sine' | 'bell' | 'pluck';
}

export const PLAIN_MUSIC: Music = { key: 0, voice: 'triangle' };
const KEYS = [0, 2, 4, 5, 7, -3];
const VOICES: readonly Music['voice'][] = ['triangle', 'sine', 'bell', 'pluck'];

export const ALL_TREATS: readonly TreatKind[] = ['berry', 'star', 'carrot', 'cupcake', 'apple', 'candy', 'cookie'];

export interface Look {
  treat: TreatKind;
  board: BoardTheme;
  sky: string;
  music: Music;
}

/**
 * The look for one play of a puzzle. A first play uses the world's own treat
 * and sky on the meadow (or the world's own board, for the reveal); a replay rolls a fresh surprise each time, never the
 * plain look.
 */
export function pickLook(world: { treat: TreatKind; sky: string; board?: BoardTheme }, replay: boolean, rand: () => number = Math.random): Look {
  if (!replay) return { treat: world.treat, board: world.board ?? MEADOW, sky: world.sky, music: PLAIN_MUSIC };
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const board = pick(BOARD_THEMES);
  const music = { key: pick(KEYS), voice: pick(VOICES) };
  // At least one thing a kid can see changes: the treat, or the board.
  const treat = board === MEADOW ? pick(ALL_TREATS.filter((t) => t !== world.treat)) : pick(ALL_TREATS);
  return { treat, board, sky: board.sky || world.sky, music };
}

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

export const BOARD_THEMES: readonly BoardTheme[] = [
  MEADOW,
  { id: 'beach', light: '#fdf4dc', dark: '#f1dca4', rim: '#d9b26a', rimDark: '#b48c45', sky: '#dff3fb' },
  { id: 'snow', light: '#f4f8fc', dark: '#cfe0f0', rim: '#8fb3d6', rimDark: '#6a8fb5', sky: '#e7eef8' },
  { id: 'autumn', light: '#fdecd6', dark: '#f4c895', rim: '#d9935a', rimDark: '#b5703a', sky: '#fdf2e4' },
  { id: 'blossom', light: '#fdf0f6', dark: '#f5cde0', rim: '#e08fb3', rimDark: '#bd6a90', sky: '#fbeef4' },
  { id: 'lagoon', light: '#e3f6f4', dark: '#a9e0d8', rim: '#5fb8ab', rimDark: '#3f978b', sky: '#e6f4f8' },
  { id: 'lavender', light: '#f1edfb', dark: '#d3c8f2', rim: '#a08ad9', rimDark: '#7d67b8', sky: '#f3effa' },
];

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
 * and sky on the meadow; a replay rolls a fresh surprise each time, never the
 * plain look.
 */
export function pickLook(world: { treat: TreatKind; sky: string }, replay: boolean, rand: () => number = Math.random): Look {
  if (!replay) return { treat: world.treat, board: MEADOW, sky: world.sky, music: PLAIN_MUSIC };
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const board = pick(BOARD_THEMES);
  const music = { key: pick(KEYS), voice: pick(VOICES) };
  // At least one thing a kid can see changes: the treat, or the board.
  const treat = board === MEADOW ? pick(ALL_TREATS.filter((t) => t !== world.treat)) : pick(ALL_TREATS);
  return { treat, board, sky: board.sky || world.sky, music };
}

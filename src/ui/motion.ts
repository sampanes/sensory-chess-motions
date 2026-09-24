// Movement timing, shared by the board (which animates) and the play screen
// (which waits for a friend to land before reacting).

import type { Kind } from '../core/types.ts';

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export const REWIND_MS = reducedMotion ? 60 : 650;

export function moveDuration(kind: Kind, distance: number): number {
  if (reducedMotion) return 60;
  if (kind === 'knight') return 460;
  if (kind === 'king' || kind === 'pawn') return 300;
  return Math.min(200 + 70 * distance, 520);
}

type Keyframes = Keyframe[];

const shift = (dc: number, dr: number) => `translate(${dc * 100}%, ${dr * 100}%)`;

/** Keyframes that carry a friend from (dc, dr) cells away back to its square. */
export function moveKeyframes(kind: Kind, dc: number, dr: number, rewind: boolean): Keyframes {
  const slide = [{ transform: shift(dc, dr) }, { transform: shift(0, 0) }];
  if (rewind || kind === 'rook' || kind === 'bishop' || kind === 'queen') return slide;
  const lift = kind === 'knight' ? -75 : -30;
  return [
    { transform: shift(dc, dr) },
    { transform: `${shift(dc / 2, dr / 2)} translateY(${lift}%) scale(1.1)`, offset: 0.5 },
    { transform: shift(0, 0) },
  ];
}

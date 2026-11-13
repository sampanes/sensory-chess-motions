// More senses (grown-up toggles, saved on this device):
//   contrast  a high-contrast board: white and slate squares in a black frame,
//             and a dark edge around everything that sits on the board
//   buzz      a tiny buzz on each hop, a longer one for a treat and a little
//             pattern for a win, on phones and tablets that can vibrate
// Both are off unless a grown-up turns them on.

export interface Senses {
  contrast: boolean;
  buzz: boolean;
}

export const NO_SENSES: Senses = { contrast: false, buzz: false };
const KEY = 'tiny-hops-senses-v1';

/** Read saved toggles; anything missing or broken is simply off. */
export function parseSenses(raw: string | null): Senses {
  try {
    const data = JSON.parse(raw ?? '{}') as Partial<Senses> | null;
    return { contrast: data?.contrast === true, buzz: data?.buzz === true };
  } catch {
    return { ...NO_SENSES };
  }
}

let senses: Senses = { ...NO_SENSES };

export function loadSenses(): Senses {
  try {
    senses = parseSenses(window.localStorage.getItem(KEY));
  } catch {
    senses = { ...NO_SENSES };
  }
  return senses;
}

/** Write the look onto <html> for the stylesheet (data-contrast="high"). */
export function applySenses(next: Senses = loadSenses()): void {
  senses = next;
  const root = document.documentElement;
  if (next.contrast) root.dataset.contrast = 'high';
  else delete root.dataset.contrast;
}

export function saveSenses(next: Senses): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: the toggles last until the page closes.
  }
  applySenses(next);
}

export const highContrast = (): boolean => senses.contrast;

/** True on devices whose browser can vibrate (most Android phones and tablets; not iPhone or iPad). */
export function canBuzz(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** A short buzz, when a grown-up turned it on and the device can do it. */
export function buzz(pattern: number | number[]): void {
  if (!senses.buzz || !canBuzz()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers refuse outside a tap: nothing to do.
  }
}

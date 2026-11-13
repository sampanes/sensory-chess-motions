// Phone or big screen. The same game has to be fun on a phone in one hand and
// on a big touchscreen (a tablet, or a PC on a stand used like a giant
// tablet). The choice is made from the screen itself, not from guessing the
// device: a short side of BIG_MIN css pixels or more gets the big-screen
// layout (bigger board, bigger buttons). A grown-up can force either one.
//
// It is written onto <html> as two attributes the stylesheet keys on:
//   data-screen="phone" | "big"     how big the buttons and the board may be
//   data-layout="stack" | "side"    bars above and below the board, or beside it
// "side" is for wide screens: a landscape phone (too short for stacked bars)
// and any big screen in landscape, so the board can use the full height.

export type ScreenPref = 'auto' | 'phone' | 'big';
export type ScreenLook = { screen: 'phone' | 'big'; layout: 'stack' | 'side' };

/** The short side, in css pixels, from which a screen counts as big. */
export const BIG_MIN = 700;
/** A landscape screen this short or shorter puts the bars beside the board. */
const SHORT_MAX = 560;
const KEY = 'tiny-hops-screen-v1';

export function screenLook(pref: ScreenPref, width: number, height: number): ScreenLook {
  const big = pref === 'big' || (pref === 'auto' && Math.min(width, height) >= BIG_MIN);
  const landscape = width > height;
  const side = landscape && (height <= SHORT_MAX || big);
  return { screen: big ? 'big' : 'phone', layout: side ? 'side' : 'stack' };
}

export function loadScreenPref(): ScreenPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'phone' || v === 'big' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveScreenPref(pref: ScreenPref) {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Private mode: the choice lasts until the page closes.
  }
  applyScreen(pref);
}

/** What auto would pick on this screen right now (for the grown-ups panel). */
export function autoLook(): ScreenLook {
  return screenLook('auto', window.innerWidth, window.innerHeight);
}

let current: ScreenPref | null = null;

/** The choice in force right now (what was last applied, even if it could not be saved). */
export function currentScreenPref(): ScreenPref {
  return current ?? loadScreenPref();
}

export function applyScreen(pref: ScreenPref = current ?? loadScreenPref()) {
  current = pref;
  const look = screenLook(pref, window.innerWidth, window.innerHeight);
  const root = document.documentElement;
  if (root.dataset.screen !== look.screen) root.dataset.screen = look.screen;
  if (root.dataset.layout !== look.layout) root.dataset.layout = look.layout;
}

/** Set the look before the first paint, and keep it right when the screen turns or the window resizes. */
export function watchScreen() {
  applyScreen();
  window.addEventListener('resize', () => applyScreen());
}

/** Full screen hides the browser's tabs and address bar, out of a toddler's reach. */
export function canFullScreen(): boolean {
  return typeof document.documentElement.requestFullscreen === 'function' &&
    !window.matchMedia?.('(display-mode: standalone)').matches;
}

export function toggleFullScreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}

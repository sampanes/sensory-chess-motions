// Registers the service worker (public/sw.js) that lets the game run offline
// and be added to a home screen. Only in real builds: during development a
// cached copy would hide code changes, so any old registration is removed.

export function registerOffline(): void {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;

  if (!import.meta.env.PROD) {
    sw.getRegistrations()
      .then((regs) => regs.forEach((r) => void r.unregister()))
      .catch(() => {});
    return;
  }

  const base = import.meta.env.BASE_URL;
  window.addEventListener('load', () => {
    // updateViaCache 'none': always check for a new sw.js, never a stale copy.
    sw.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).catch(() => {
      // No offline support (private mode, blocked storage). The game still works.
    });
  });
}

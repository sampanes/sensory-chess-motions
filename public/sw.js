// Offline support for Tiny Hops.
//
// Network first: whenever there is a connection the newest version is used
// (and saved), so an update can never get stuck behind an old cache. The saved
// copy is only served when the network fails or is very slow. The whole game
// is one HTML file, so saving the page saves everything.

const CACHE_PREFIX = 'tiny-hops-';
const CACHE = 'tiny-hops-v3';
const LEGACY_CACHE = 'tbk-v1';
const SLOW_MS = 4000;
const scoped = (path) => new URL(path, self.registration.scope).href;
const ROOT = scoped('./');
const OPTIONAL_SHELL = ['favicon.svg', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Do not activate a fresh worker unless the actual game is safely saved.
      await cache.add(ROOT);
      // Optional install art should not prevent the game itself from working.
      await Promise.all(OPTIONAL_SHELL.map((p) => cache.add(scoped(p)).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // CacheStorage is origin-wide on GitHub Pages. Delete only our caches.
      const keys = await caches.keys();
      const old = keys.filter((k) => (k.startsWith(CACHE_PREFIX) || k === LEGACY_CACHE) && k !== CACHE);
      await Promise.all(old.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Every page visit (?p=..., ?maker, plain) is the same single HTML file.
  const key = req.mode === 'navigate' ? ROOT : req;

  // Pages are revalidated with the server every time (a cheap 304 when nothing
  // changed), so the browser's own 10-minute cache cannot hide a fresh deploy.
  const network = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);
  const update = network.then(async (res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      const cache = await caches.open(CACHE);
      await cache.put(key, copy);
    }
  });
  // Storage can be full or blocked. That must never discard a good response.
  event.waitUntil(update.catch(() => {}));

  event.respondWith(
    (async () => {
      try {
        return await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), SLOW_MS)),
        ]);
      } catch {
        let saved;
        try {
          const cache = await caches.open(CACHE);
          saved = await cache.match(key);
        } catch {
          // A broken cache should not mask a network request still in flight.
        }
        return saved || network; // nothing saved yet: keep waiting for the network
      }
    })(),
  );
});

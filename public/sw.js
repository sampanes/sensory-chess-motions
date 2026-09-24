// Offline support for Tiny Hops.
//
// Network first: whenever there is a connection the newest version is used
// (and saved), so an update can never get stuck behind an old cache. The saved
// copy is only served when the network fails or is very slow. The whole game
// is one HTML file, so saving the page saves everything.

const CACHE = 'tiny-hops-v2';
const SLOW_MS = 4000;
const scoped = (path) => new URL(path, self.registration.scope).href;
const SHELL = ['./', 'favicon.svg', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // One missing file must not stop the game from working offline.
      await Promise.all(SHELL.map((p) => cache.add(scoped(p)).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Also clears caches left behind by the older versions of this app.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Every page visit (?p=..., ?maker, plain) is the same single HTML file.
  const key = req.mode === 'navigate' ? scoped('./') : req;

  const network = fetch(req).then(async (res) => {
    if (res.ok && res.type === 'basic') {
      const cache = await caches.open(CACHE);
      await cache.put(key, res.clone());
    }
    return res;
  });
  event.waitUntil(network.catch(() => {}));

  event.respondWith(
    (async () => {
      try {
        return await Promise.race([
          network,
          new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), SLOW_MS)),
        ]);
      } catch {
        const saved = await caches.match(key);
        return saved || network; // nothing saved yet: keep waiting for the network
      }
    })(),
  );
});

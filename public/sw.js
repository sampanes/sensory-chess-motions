// Retired service worker. Older versions of the game cached files here; this
// version clears those caches and removes itself so everyone gets fresh code.

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const windows = await self.clients.matchAll({ type: 'window' });
      windows.forEach((w) => w.navigate(w.url));
    })(),
  );
});

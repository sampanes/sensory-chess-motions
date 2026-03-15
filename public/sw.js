// The Borrowed Kingdom — Service Worker
// Caches the app shell for offline play.

const CACHE_NAME = 'tbk-v1';

// Install: cache everything the browser fetches
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses (not opaque, not errors)
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

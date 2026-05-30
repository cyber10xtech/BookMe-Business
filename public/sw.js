const CACHE_NAME = 'bookme-static-v1';
const API_CACHE = 'bookme-api-v1';
const SUPABASE_ORIGIN = 'https://trnsuruvwdzfrhfaboxe.supabase.co';

const PRECACHE = [
  '/',
  '/index.html',
  '/robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // SPA navigation: try network, fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Same-origin static assets: cache-first
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          try { const clone = res.clone(); caches.open(CACHE_NAME).then(c => c.put(req, clone)); } catch (e) {}
          return res;
        }).catch(() => caches.match('/index.html'))
      )
    );
    return;
  }

  // Supabase API: network-first, fallback to cache when offline
  if (url.origin === SUPABASE_ORIGIN) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || new Response(null, { status: 503 })))
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

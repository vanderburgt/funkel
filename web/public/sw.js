// Funkel service worker — app shell + artwork cache.
// Audio is intentionally never cached (Range requests stream through).

const SHELL = 'funkel-shell-v1';
const ART = 'funkel-art-v1';
const ART_MAX = 200;

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL && k !== ART).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // never intercept audio or API data
  if (url.pathname === '/api/audio') return;

  // artwork: cache-first with a small LRU
  if (url.pathname === '/api/img') {
    e.respondWith((async () => {
      const cache = await caches.open(ART);
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) {
        cache.put(e.request, res.clone());
        trimCache(ART, ART_MAX);
      }
      return res;
    })());
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  // hashed build assets: cache-first
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    })());
    return;
  }

  // navigations: network-first, fall back to cached shell
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        const cache = await caches.open(SHELL);
        cache.put('/', res.clone());
        return res;
      } catch {
        const cache = await caches.open(SHELL);
        return (await cache.match('/')) || Response.error();
      }
    })());
  }
});

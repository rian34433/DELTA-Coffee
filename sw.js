// Bump tiap rilis frontend — offline client menyajikan fallback dari cache lama
const CACHE_NAME = 'delta-coffee-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Gagal cache beberapa aset PWA:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Jangan tangani skema non-http/https, non-GET, atau API calls
  if (!url.protocol.startsWith('http') || req.method !== 'GET' || url.pathname.includes('/api/')) {
    return;
  }

  // Network-first dengan fallback ke cache untuk dokumen & aset shell
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html').then((fallback) => {
              return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
            });
          }
          return new Response('', { status: 408, statusText: 'Offline' });
        });
      })
  );
});

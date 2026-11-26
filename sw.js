
const CACHE_NAME = 'localify-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Install the new version
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate the new version
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('localify-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first strategy to fetch updated files
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;

          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }

          return Response.error();
        });
      })
  );
});

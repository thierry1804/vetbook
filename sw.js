/**
 * Service Worker VetBook — cache de l'app shell pour usage hors ligne / PWA
 */
const CACHE_NAME = 'vetbook-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function (err) { console.warn('VetBook SW install:', err); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  if (event.request.url.indexOf(self.location.origin) !== 0) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (res) {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        var clone = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(event.request, clone); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (f) {
          return f || new Response('Hors ligne', { status: 503, statusText: 'Service Unavailable' });
        });
      });
    })
  );
});

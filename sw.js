/**
 * Service Worker App'lika — cache de l'app shell pour usage hors ligne / PWA
 */
const CACHE_NAME = 'applika-v8';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './vendor/qrcode.min.js',
  './data-layer.js'
  // Note : config.js est volontairement absent (spécifique à chaque
  // déploiement, potentiellement inexistant) — Cache.addAll() échouerait
  // entièrement si une seule URL de la liste est introuvable.
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function (err) { console.warn('App\'lika SW install:', err); })
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
  // Cross-origin requests (Overpass API, Google Fonts, ...) are left to the
  // network/browser cache; nothing to vendor locally beyond app assets.
  if (event.request.url.indexOf(self.location.origin) !== 0) return;

  event.respondWith(
    fetch(event.request).then(function (res) {
      if (!res || res.status !== 200 || res.type !== 'basic') return res;
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function (c) { c.put(event.request, clone); });
      return res;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        if (cached) return cached;
        return caches.match('./index.html').then(function (f) {
          return f || new Response('Hors ligne', { status: 503, statusText: 'Service Unavailable' });
        });
      });
    })
  );
});

// ——— Web Push : reçoit un rappel même app fermée, envoyé par la fonction
// planifiée Vercel (api/cron/send-reminders.js). ———
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (err) { /* payload non JSON, on garde les valeurs par défaut */ }

  event.waitUntil(
    self.registration.showNotification(data.title || 'App\'lika', {
      body: data.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag || 'vetbook-reminder',
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

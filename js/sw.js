/* Service Worker — offline cache */
var CACHE = 'bp-v2';
var URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/favicon.svg',
  '/js/app.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(URLS); })
  );
});

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
  );
});

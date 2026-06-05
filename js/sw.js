/* Service Worker — offline cache */
var CACHE = 'bp-v1';
var URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/favicon.svg',
  '/js/00-base.js',
  '/js/01-i18n.js',
  '/js/02-auth.js',
  '/js/03-security.js',
  '/js/04-publish.js',
  '/js/05-data.js',
  '/js/06-ui.js',
  '/js/07-main.js',
  '/js/notifications.js',
  '/js/shortcuts.js'
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('habit-tracker-cache').then(cache => {
      return cache.addAll([
        'index.html',
        'css/styles.css',
        'js/utils.js',
        'js/habits.js',
        'js/app.js',
        'icons/icon-192x192.png',
        'icons/icon-512x512.png'
      ]);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

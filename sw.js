self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('animator-cache').then(cache => cache.addAll([
      './animator.html',
      './manifest.json',
      './src/animator.js',
      './src/utils.js',
      './index.html',
      './src/game.js'
    ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

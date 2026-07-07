const CACHE_NAME = 'daily-clock-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  // Delete old caches to ensure the user gets the latest code
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Network-First Strategy
// This ensures you ALWAYS get the newest code on refresh, but falls back to cache if offline.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If network fetch succeeds, we optionally update the cache (omitted for simplicity here)
        return networkResponse;
      })
      .catch(() => {
        // If network fetch fails (user is offline), fallback to the cache
        return caches.match(event.request);
      })
  );
});

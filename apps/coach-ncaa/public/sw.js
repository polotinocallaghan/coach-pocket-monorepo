const CACHE_NAME = 'coach-pocket-offline-v1';

// Add lists of files to cache here.
const urlsToCache = [
    '/',
    '/manifest.json', // Will route to our dynamic /manifest
    '/icon',          // Will route to our dynamic /icon
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// A network-first approach, falling back to cache if offline
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // We don't cache extension-based files (like chrome-extension://) or non-http protocols
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful non-API responses to use later
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If the fetch fails (e.g., offline), look for it in the cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    // Optionally return an offline generic page here if not matched,
                    // but Firebase handles data perfectly for SPA navigation.
                });
            })
    );
});

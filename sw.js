// Service Worker for NEXUS AUTO
const CACHE_NAME = 'nexus-auto-disabled';
const urlsToCache = [];

// Install event
self.addEventListener('install', event => {
    // Do not pre-cache; activate immediately
    self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', event => {
    // Only handle same-origin requests; let cross-origin (Firebase, CDNs) bypass SW entirely
    const reqUrl = new URL(event.request.url);
    if (reqUrl.origin !== self.location.origin) {
        return;
    }
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => Promise.all(cacheNames.map(c => caches.delete(c)))).then(() => self.clients.claim())
    );
});

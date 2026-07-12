const CACHE_NAME = 'tulsi-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/foodData.js',
    '/js/engine.js',
    '/js/app.js'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(networkResponse => {
                if (event.request.url.includes('fonts.')) {
                    const clone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return networkResponse;
            }).catch(() => new Response('Offline content not found.', { status: 503 }));
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            if (windowClients.length > 0) windowClients[0].focus();
            else clients.openWindow('/');
        })
    );
});

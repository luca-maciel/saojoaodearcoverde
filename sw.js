// Service worker para cache dos arquivos essenciais e suporte offline.

const CACHE_NAME = 'sao-joao-arcoverde-v4';

const assetsToCache = [
    './',
    './index.html',
    './manifest.json',
    './assets/images/favicon.jpg',
    './css/style.css',
    './js/app.js',
    './js/sql-wasm.js',
    './js/sql-wasm.wasm',
    './db/sjDbTeste.db'
];

self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(assetsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');

    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
        return;
    }

    const freshRequest = new Request(event.request, { cache: 'reload' });

    event.respondWith(
        fetch(freshRequest)
            .then(networkResponse => {
                const responseClone = networkResponse.clone();

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });

                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }

                    return new Response('Conteudo indisponivel offline');
                });
            })
    );
});

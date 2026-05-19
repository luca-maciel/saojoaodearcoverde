const CACHE_NAME = 'sao-joao-arcoverde-v2';

// Arquivos essenciais para cache
const assetsToCache = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './data/programacao.json',
    './data/restaurantes.json',
    './data/hoteis.json'
];

// Instalação - cache dos arquivos
self.addEventListener('install', event => {
    console.log('Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Cacheando arquivos...');
            return cache.addAll(assetsToCache);
        })
    );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
    console.log('Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch - estratégia cache-first
self.addEventListener('fetch', event => {
    // Ignora requisições que não são do mesmo domínio
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Retorna do cache ou faz fetch
            return cachedResponse || fetch(event.request).catch(() => {
                // Fallback para página offline (se necessário)
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return new Response('Conteúdo indisponível offline');
            });
        })
    );
});
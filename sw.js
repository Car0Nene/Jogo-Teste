// O deploy substitui o número da versão pelo ID da execução do GitHub Actions.
const CACHE_NAME = 'familia-fighter-v17';
const APP_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/game.js',
  './js/audio.js',
  './js/account.js',
  './js/sprite-data.js',
  './js/dialogue.js',
  './supabase-config.js',
  './manifest.webmanifest',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/sprites/fighters.png',
  './assets/menu/menu.webp',
  './assets/portraits/juraci.png',
  './assets/portraits/carlos.png',
  './assets/portraits/pedro.png',
  './assets/portraits/daniel.png',
  './assets/portraits/franciely.png',
  './assets/portraits/gabi.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS.map(asset => new Request(asset, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith('familia-fighter-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase/CDN nunca passam pelo cache

  // Página: rede primeiro (pega atualizações), cache como reserva offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          event.waitUntil(cache.put('./index.html', response.clone()));
        }
        return response;
      } catch (error) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Arquivos estáticos: cache primeiro (versão fixa por deploy).
  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      event.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  })());
});

const CACHE_NAME = 'familia-fighter-v12';
const APP_ASSETS = [
  './',
  './index.html',
  './supabase-config.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './tela_inicial.png',
  './menu-familia.png',
  './juraci-rosto.png',
  './carlos-rosto.png',
  './Sprite Sheet Arcade de Juju e Carlos.png',
  './combat-sprites.png',
  './specials-reference.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(APP_ASSETS.map(async asset => {
          const response = await fetch(new Request(asset, { cache: 'reload' }));
          if (!response.ok) throw new Error(`Falha ao carregar ${asset}: HTTP ${response.status}`);
          await cache.put(asset, response);
        }));
        await self.skipWaiting();
      } catch (error) {
        console.error('Não foi possível instalar o cache offline do jogo.', error);
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name.startsWith('familia-fighter-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            event.waitUntil(
              caches.open(CACHE_NAME)
                .then(cache => cache.put('./index.html', response.clone()))
                .catch(error => console.error('Não foi possível atualizar o cache da página.', error))
            );
          }
          return response;
        })
        .catch(error => caches.match('./index.html').then(cached => {
          if (cached) return cached;
          throw error;
        }))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, response.clone()))
              .catch(error => console.error('Não foi possível guardar um recurso no cache offline.', error))
          );
        }
        return response;
      }))
  );
});

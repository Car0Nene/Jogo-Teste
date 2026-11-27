/**
 * Service Worker - Família Fighter
 *
 * Regra principal: o jogo nunca mostra arte, voz ou música de uma versão antiga.
 * - Arquivos com versão no nome/URL (bundles com hash, "?v=") são imutáveis: cache primeiro.
 * - Mídia estática da publicação (vozes, músicas, sprites, retratos, cenários, vídeo): cache
 *   primeiro DENTRO desta publicação. Como ab1411dd5d41 muda a cada build e a ativação apaga os
 *   caches anteriores, nunca aparece mídia de versão antiga — e no celular cada fala/sprite não
 *   vai mais à rede toda vez (era isso que engasgava as falas no 4G).
 * - Páginas, scripts sem hash e configuração vão SEMPRE à rede primeiro; cache só offline.
 */

const CACHE_NAME = 'familia-fighter-ab1411dd5d41';

const isBuildMedia = (url) =>
  /\/assets\/.+\.(mp3|ogg|m4a|wav|webp|png|jpg|jpeg|gif|svg|mp4|webm|json|glb|ktx2)$/i.test(url.pathname);

const isImmutable = (url) =>
  url.searchParams.has('v') || /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(url.pathname);

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

const store = (request, response) => {
  if (response && response.status === 200 && response.type !== 'opaque') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // pedidos parciais (áudio/vídeo com Range) vão direto à rede
  if (request.headers.has('range')) return;

  if (isImmutable(url) || isBuildMedia(url)) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((r) => store(request, r))));
    return;
  }

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((r) => store(request, r))
      .catch(() => caches.match(request).then((hit) => hit || new Response('Offline', { status: 503 })))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

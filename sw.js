/**
 * Service Worker - Família Fighter
 *
 * Regra principal: o jogo nunca mostra arte, voz ou música de uma versão antiga.
 * - Arquivos com versão no nome/URL (bundles com hash, "?v=") são imutáveis: cache primeiro.
 * - Todo o resto (sprites, vozes, retratos, cenários, páginas) vai SEMPRE à rede primeiro;
 *   o cache só é usado quando o aparelho está offline.
 * - a63ad44cf078 é trocado a cada build, então cada publicação apaga os caches anteriores.
 */

const CACHE_NAME = 'familia-fighter-a63ad44cf078';

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

  if (isImmutable(url)) {
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

/**
 * Service Worker - Família Fighter
 * Cache Busting Automático v2.1.0
 * 
 * Este Service Worker:
 * - Gerencia cache inteligente
 * - Remove caches antigos automaticamente
 * - Força atualização de index.html, manifest e sw.js
 * - Mantém assets versionados em cache
 * - Funciona offline
 */

const CACHE_VERSION = 'v2.1.0-20261126';
const CACHE_NAME = `familia-fighter-${CACHE_VERSION}`;

// URLs que NUNCA devem ser cacheadas (sempre fetch fresh)
const NO_CACHE_URLS = [
  'index.html',
  'manifest.webmanifest',
  'sw.js'
];

/**
 * INSTALL EVENT
 * Instalar novo Service Worker e criar cache
 */
self.addEventListener('install', event => {
  console.log(`[SW] Instalando: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW] Cache criado: ${CACHE_NAME}`);
      return self.skipWaiting();
    })
  );
});

/**
 * ACTIVATE EVENT
 * Remover caches antigos e ativar novo Service Worker
 */
self.addEventListener('activate', event => {
  console.log(`[SW] Ativando: ${CACHE_NAME}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`[SW] Tomando controle de todas as abas`);
      return self.clients.claim();
    })
  );
});

/**
 * FETCH EVENT
 * Interceptar requisições e servir do cache ou fetch
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. NUNCA cachear index.html, manifest.webmanifest, sw.js
  // Sempre ir para o servidor
  if (NO_CACHE_URLS.some(pattern => url.pathname.includes(pattern))) {
    console.log(`[SW] FETCH (sem cache): ${url.pathname}`);
    return event.respondWith(
      fetch(request)
        .then(response => {
          // Se conseguiu fetch, retorna
          if (response.status === 200) {
            return response;
          }
          // Se erro, tenta cache como fallback
          return caches.match(request).then(cached => cached || response);
        })
        .catch(() => {
          // Se falhar (offline), tenta cache
          return caches.match(request).then(cached => {
            if (cached) {
              console.log(`[SW] Usando cache (offline): ${url.pathname}`);
              return cached;
            }
            // Sem cache e offline = erro
            throw new Error(`Offline: ${url.pathname}`);
          });
        })
    );
  }

  // 2. Para assets versionados (com ?v=...), usar cache primeiro
  // Se não estiver em cache, fetch e adicionar ao cache
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        console.log(`[SW] CACHE HIT: ${url.pathname}`);
        return cachedResponse;
      }

      console.log(`[SW] FETCH (assets): ${url.pathname}`);
      return fetch(request)
        .then(response => {
          // Validar resposta
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clonar resposta para cachear
          const responseClone = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
            console.log(`[SW] CACHED: ${url.pathname}`);
          });

          return response;
        })
        .catch(error => {
          console.error(`[SW] FETCH ERRO: ${url.pathname}`, error);
          
          // Se falhar, tentar cache como fallback
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              console.log(`[SW] Usando cache (fallback): ${url.pathname}`);
              return cachedResponse;
            }
            
            // Sem cache e erro = offline response
            return new Response(
              'Recurso não disponível (offline)',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            );
          });
        });
    })
  );
});

/**
 * MESSAGE EVENT
 * Permitir comunicação com cliente
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log(`[SW] SKIP_WAITING acionado`);
    self.skipWaiting();
  }
});

console.log(`[SW] Service Worker carregado: ${CACHE_VERSION}`);

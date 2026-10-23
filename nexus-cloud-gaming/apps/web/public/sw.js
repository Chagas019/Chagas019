/*
 * Service worker do NEXUS (PWA).
 *
 * Estratégia:
 * - Navegação: rede primeiro; sem rede, usa a página em cache ou /offline.
 * - Arquivos estáticos do build (/_next/static, fontes, ícones): cache primeiro, são imutáveis.
 * - /api/*: nunca cacheado — status e conexão precisam ser reais.
 *
 * O streaming de jogo (WebRTC) não passa pelo service worker.
 */
const VERSION = 'nexus-v1';
const SHELL = ['/', '/offline', '/catalogo', '/controle', '/sala-de-teste', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/offline')) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(woff2?|svg|png)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

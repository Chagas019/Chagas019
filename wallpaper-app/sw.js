// Service worker: guarda o app para funcionar offline. As artes são geradas no
// aparelho, então não há imagens para baixar da rede.
const VERSION = 'aura-v1';
const SHELL = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/art.js', 'js/catalog.js', 'js/prng.js', 'js/store.js',
  'icon.svg', 'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Rede primeiro (sempre a versão mais nova), cache como reserva offline.
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});

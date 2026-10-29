/* MídiaFlow: funciona sem internet. Páginas: rede primeiro (cai para a cópia guardada).
   Arquivos de /assets têm nome com hash: guardados na primeira visita. */
const CACHE = 'midiaflow-v1';
const SHELL = ['/', '/servo', '/manifest.webmanifest', '/servo.webmanifest', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname === '/servo' ? '/servo' : '/', copy));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname === '/servo' ? '/servo' : '/')) || (await caches.match('/'))),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname) || url.pathname.endsWith('.png')) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});

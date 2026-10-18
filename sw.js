/* Versioned app shell. Bump VERSION whenever any bundled file changes. */
const VERSION = 'v29';
const PREFIX = 'danang-vegan:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + VERSION;
const LOCAL = [
  './',
  './index.html',
  './assets/styles.css',
  './assets/mobile.css',
  './assets/core.js',
  './assets/data.js',
  './assets/app.js',
  './assets/ux.js',
  './assets/vendor/leaflet.js',
  './assets/vendor/leaflet.css',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './manifest.webmanifest',
  './assets/products/handy-chay.webp',
  './assets/products/vifon-chay.webp',
  './assets/products/choice-coconut.webp',
  './assets/products/choice-cashew.webp',
  './assets/products/oreo-vanilla.webp',
  './assets/products/vinamit-jackfruit.webp',
  './assets/products/choice-sweetpotato.webp',
  './assets/products/choice-seaweed.webp',
  './assets/products/bibigo-seaweed.webp',
  './assets/products/langfarm-taro.webp',
  './assets/products/langfarm-pineapple.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(LOCAL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);

  if (
    event.request.method !== 'GET' ||
    url.origin !== scope.origin ||
    !url.pathname.startsWith(scope.pathname)
  ) {
    return;
  }

  const allowed = new Set(LOCAL.map((path) => new URL(path, scope).href));
  const appDocument =
    event.request.mode === 'navigate' &&
    (url.pathname === scope.pathname || url.pathname === new URL('./index.html', scope).pathname);

  if (!allowed.has(url.href) && !appDocument) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const key = appDocument ? new URL('./index.html', scope).href : event.request;
      const cached = await cache.match(key);
      if (cached) return cached;

      let response;
      try {
        response = await fetch(event.request);
      } catch {
        return Response.error();
      }

      if (response.ok && allowed.has(url.href)) {
        try {
          await cache.put(key, response.clone());
        } catch {
          // Preserve the network response if optional storage fails.
        }
      }

      return response;
    })(),
  );
});

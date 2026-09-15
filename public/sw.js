/*
 * OpenTune service worker.
 *
 * The app is a handful of static files with no backend, so the caching story
 * is simple and deliberately hand-written rather than generated: cache
 * everything same-origin as it is fetched, serve from cache when the network
 * is gone, and always have the page itself available for a cold offline start.
 *
 * Bump CACHE when the strategy changes; old caches are deleted on activate.
 *
 * This is only ever registered in a production build. Running it against a
 * dev server serves stale JS and CSS forever, because dev asset URLs get
 * reused between rebuilds — see _components/ServiceWorker.tsx.
 */

const CACHE = "opentune-v2";

/** The minimum needed to open the tuner with no network at all. */
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // One missing file must not fail the whole install, so each is added
      // on its own and failures are tolerated.
      .then((cache) =>
        Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: try the network so an update is picked up promptly, fall
  // back to the cached page. Without this a cold offline start shows the
  // browser's error page instead of the tuner.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Everything else is a hashed static asset: cache first, since a given URL
  // never changes contents, and populate the cache on the way past.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});

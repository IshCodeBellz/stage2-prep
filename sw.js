/* Offline cache for Cab Ready.

   The simulators are the part that has to work with no signal — on the
   Underground, between stations, in a depot mess room. The marketing and
   resource pages are cached opportunistically: whatever you have read once is
   readable again offline, but nothing is precached beyond the app itself.

   Bump CACHE whenever simulators.html or the shared assets change, or phones
   that already installed the app keep serving the old copy. */

const CACHE = "stage2-v43";
const APP = "/simulators";
const ASSETS = [
  APP,
  "/",
  "/manifest.webmanifest",
  "/icon-180.png",
  "/icon-512.png",
  "/assets/site.css",
  "/assets/site.js",
  "/assets/tiers.js",
  "/assets/resources.js",
  "/assets/fonts.css",
  /* The design's three families, self-hosted so the app keeps its type with no
     signal. Only the latin cuts are precached: the latin-ext files carry a
     unicode-range, so a browser fetches one only if a page actually uses a
     character from it, which these pages almost never do. */
  "/assets/fonts/archivo-latin-400-800.woff2",
  "/assets/fonts/public-sans-latin-400-700.woff2",
  "/assets/fonts/ibm-plex-mono-latin-400.woff2",
  "/assets/fonts/ibm-plex-mono-latin-500.woff2",
  "/assets/fonts/ibm-plex-mono-latin-600.woff2",
  "/assets/fonts/ibm-plex-mono-latin-700.woff2"
];
// scene photographs are fetched once into IndexedDB, so they are not precached

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // one missing file must not fail the whole install
      .then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // sign-in, checkout and the session: always the network, never a cached copy
  if (url.pathname.startsWith("/api/")) return;

  if (e.request.mode === "navigate") {
    // Network first for pages, so a redeploy shows up as soon as you have signal.
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          return r;
        })
        .catch(() =>
          caches.match(url.pathname).then((r) => r || caches.match(APP))
        )
    );
  } else {
    // Cache first for assets, refreshing in the background.
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const live = fetch(e.request)
          .then((r) => {
            if (r && r.ok) {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return r;
          })
          .catch(() => hit);
        return hit || live;
      })
    );
  }
});

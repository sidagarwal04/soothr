// Soothr service worker.
//
// Goals:
//  1. Full offline support — the app shell and every sound are precached, and
//     hashed build assets are cached on first use, so Soothr runs with no
//     network once it has been opened online once.
//  2. Silent background updates — a normal deploy installs and activates the
//     new worker automatically (skipWaiting). The running page is never force-
//     reloaded (that would interrupt a baby's sleep sound); the fresh version
//     is picked up the next time the app is launched.
//  3. A refresh prompt for MAJOR updates only — bump APP_MAJOR when a release
//     needs the user to reload right away. That release stays in the "waiting"
//     state and tells open clients to show a "refresh" banner instead of
//     silently swapping in.
//
// HOW TO VERSION:
//  - Bump BUILD on every deploy (any string change works). This rotates the
//    cache so stale static files (sounds, icon, offline HTML) are refreshed.
//  - Bump APP_MAJOR ONLY for a big/breaking release that should prompt the
//    user to refresh immediately.

const APP_MAJOR = 1;
const BUILD = "2026-07-01-4";
const CACHE = `soothr-cache-${BUILD}`;
// Persistent store (survives version rotation) for update bookkeeping.
const META = "soothr-meta";
const MAJOR_KEY = "/__activated_major";
const PENDING_MAJOR_KEY = "/__pending_major";

// Everything needed for a first-run offline experience. Hashed JS/CSS chunks
// are not known here; they are cached at runtime by the fetch handler.
const PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/sounds/rain.mp3",
  "/sounds/ocean.mp3",
  "/sounds/stream.mp3",
  "/sounds/forest.mp3",
  "/sounds/crickets.mp3",
  "/sounds/wind.mp3",
];

async function metaGet(key) {
  try {
    const cache = await caches.open(META);
    const res = await cache.match(key);
    return res ? await res.text() : null;
  } catch {
    return null;
  }
}

async function metaPut(key, value) {
  try {
    const cache = await caches.open(META);
    await cache.put(key, new Response(String(value)));
  } catch {
    /* best-effort */
  }
}

async function metaDelete(key) {
  try {
    const cache = await caches.open(META);
    await cache.delete(key);
  } catch {
    /* best-effort */
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window",
  });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Precache the shell + sounds. Add each individually so one failed
      // fetch (e.g. a flaky asset) doesn't abort the whole install.
      const cache = await caches.open(CACHE);
      await Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {})));

      const prevRaw = await metaGet(MAJOR_KEY);
      const prevMajor = prevRaw === null ? null : Number(prevRaw);
      const isMajorUpdate =
        prevMajor !== null &&
        Number.isFinite(prevMajor) &&
        APP_MAJOR > prevMajor;

      if (isMajorUpdate) {
        // Stay in "waiting" and ask open clients to offer a manual refresh.
        await metaPut(PENDING_MAJOR_KEY, "1");
        await notifyClients({ type: "SW_MAJOR_UPDATE_WAITING" });
      } else {
        // First install or a minor/patch update → take over silently.
        await metaDelete(PENDING_MAJOR_KEY);
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await metaPut(MAJOR_KEY, APP_MAJOR);
      await metaDelete(PENDING_MAJOR_KEY);
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE && key !== META)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHTML = req.mode === "navigate" || req.destination === "document";

  if (isHTML) {
    // Network-first so navigations get fresh markup, falling back to the
    // cached shell when offline.
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
          return res;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else (hashed JS/CSS chunks, sounds, icons): cache-first, and
  // populate the cache on first fetch so it's available offline afterwards.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return Response.error();
      }
    })(),
  );
});

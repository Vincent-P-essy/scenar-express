const CACHE = "scenar-express-v112";

// Mets ici TOUT ce qui doit marcher offline direct
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",

  // favicons / icônes
  "./favicon.ico",
  "./favicon-96x96.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-windows.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting(); // applique la nouvelle version plus vite
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
      await self.clients.claim(); // prend le contrôle sans attendre
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // On ne gère que ton domaine (pas les autres)
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === "navigate" || url.pathname.endsWith(".html");
  const isManifest = url.pathname.endsWith("manifest.json");

  // ✅ Network-first pour HTML + manifest (pour voir les MAJ)
  if (isHTML || isManifest) {
    event.respondWith(networkFirst(req));
    return;
  }

  // ✅ Cache-first pour le reste (icônes, png, ico, etc.)
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return cached || Response.error();
  }
}

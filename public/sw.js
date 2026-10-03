/* Only public, static resources belong in these caches. Never cache patient data. */
const CACHE_PREFIX = "econolab-pwa-";
const CACHE_VERSION = "v1";
const STATIC_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-assets`;
const OFFLINE_URL = "/offline.html";
const NAVIGATION_TIMEOUT_MS = 5000;
const MAX_RUNTIME_ASSETS = 100;
const CACHE_BUILD_ASSETS = new URL(self.location.href).searchParams.get("dev") !== "1";
const STATIC_URLS = [
  OFFLINE_URL,
  "/offline.css",
  "/offline.js",
  "/econolab-brand.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];
const STATIC_PATHS = new Set(STATIC_URLS);

self.addEventListener("install", (event) => {
  // A failed precache leaves the currently active worker in place.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_URLS.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE && key !== ASSET_CACHE)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

function isPrivateOrNonDocumentRequest(request, url) {
  return url.pathname === "/api"
    || url.pathname.startsWith("/api/")
    || /\.pdf$/i.test(url.pathname)
    || request.headers.has("next-action")
    || request.headers.get("RSC") === "1"
    || request.headers.get("accept")?.includes("text/x-component")
    || request.headers.get("accept")?.includes("application/pdf")
    || url.searchParams.has("_rsc");
}

async function offlineDocument() {
  let offline;
  try {
    const cache = await caches.open(STATIC_CACHE);
    offline = await cache.match(OFFLINE_URL);
  } catch {
    // Storage may be disabled or evicted by the browser.
  }
  // An emergency page also works if the browser has evicted Cache Storage.
  return offline || new Response(
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Econolab sin conexión</title><h1>Econolab sin conexión</h1><p>Conéctate a internet para consultar y guardar información del laboratorio.</p><p><a href="/home">Reintentar conexión</a></p></html>',
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function networkDocument(request) {
  const controller = new AbortController();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error("Navigation timed out"));
      }, NAVIGATION_TIMEOUT_MS);
    });
    const response = await Promise.race([
      fetch(request, { signal: controller.signal }),
      timeout,
    ]);
    return response.status >= 500 ? offlineDocument() : response;
  } catch {
    return offlineDocument();
  } finally {
    clearTimeout(timer);
  }
}

async function staticResource(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(new URL(request.url).pathname);
    if (cached) return cached;
  } catch {
    // An unavailable cache must not hide a resource that can load from the network.
  }
  return fetch(request);
}

async function buildAsset(request) {
  let cache;
  try {
    cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
  } catch {
    // Continue online when Cache Storage is unavailable.
  }
  const response = await fetch(request);
  if (cache && response.ok && response.type !== "opaque"
    && !/(?:private|no-store)/i.test(response.headers.get("cache-control") || "")) {
    try {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_RUNTIME_ASSETS))
        .map((key) => cache.delete(key)));
    } catch {
      // Quota or storage failures must not break a successful network response.
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateOrNonDocumentRequest(request, url)) return;

  if (STATIC_PATHS.has(url.pathname)) {
    event.respondWith(staticResource(request));
  } else if (request.mode === "navigate") {
    // Authenticated HTML is always requested from the server and is never cached.
    event.respondWith(networkDocument(request));
  } else if (CACHE_BUILD_ASSETS && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(buildAsset(request));
  }
});

function notificationTarget(value) {
  try {
    const target = new URL(typeof value === "string" ? value : "/home", self.location.origin);
    if (target.origin === self.location.origin && !target.username && !target.password) {
      return target.href;
    }
  } catch {
    // Invalid notification destinations are sent to the app's home screen.
  }
  return new URL("/home", self.location.origin).href;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const appWindows = windows.filter((client) => new URL(client.url).origin === self.location.origin);
    const existing = appWindows.find((client) => client.url === target) || appWindows[0];
    if (existing) {
      try {
        if (existing.url !== target) await existing.navigate(target);
        await existing.focus();
        return;
      } catch {
        // The selected window may have closed between matchAll and focus.
      }
    }
    await self.clients.openWindow(target);
  })());
});

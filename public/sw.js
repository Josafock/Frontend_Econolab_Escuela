/* Only public, static resources belong in these caches. Never cache patient data. */
const CACHE_PREFIX = "econolab-pwa-";
const CACHE_VERSION = "v3-public-entry";
const STATIC_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}-assets`;
const PUBLIC_URLS = ["/", "/nosotros", "/servicios-laboratorio", "/contacto"];
const PUBLIC_PATHS = new Set(PUBLIC_URLS);
const NAVIGATION_TIMEOUT_MS = 5000;
const MAX_RUNTIME_ASSETS = 100;
const CACHE_BUILD_ASSETS = new URL(self.location.href).searchParams.get("dev") !== "1";
const STATIC_URLS = [
  "/econolab-brand.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];
const STATIC_PATHS = new Set(STATIC_URLS);

function publicRequest(path) {
  return new Request(path, { cache: "reload", credentials: "omit" });
}

function buildResourcePaths(text, basePath = "/") {
  // HTML includes its scripts/styles/font preloads; stylesheets may reference more fonts.
  const paths = new Set(text.match(/\/_next\/static\/[A-Za-z0-9_./%+@~-]+/g) || []);
  for (const match of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) {
    try {
      const resource = new URL(match[1], new URL(basePath, self.location.origin));
      if (resource.origin === self.location.origin && resource.pathname.startsWith("/_next/static/")) paths.add(resource.pathname);
    } catch { /* Ignore a malformed or non-network CSS reference. */ }
  }
  return [...paths];
}

async function precachePublicSite() {
  const cache = await caches.open(STATIC_CACHE);
  await cache.addAll(STATIC_URLS.map(publicRequest));
  const resources = new Set();
  // Only these four public routes are eligible for HTML caching, without cookies.
  for (const path of PUBLIC_URLS) {
    const response = await fetch(publicRequest(path));
    if (!response.ok || response.redirected || !response.headers.get("content-type")?.includes("text/html")) {
      throw new Error(`Public page unavailable: ${path}`);
    }
    const html = await response.clone().text();
    await cache.put(path, response);
    if (CACHE_BUILD_ASSETS) buildResourcePaths(html).forEach((resource) => resources.add(resource));
  }
  // Fetch dependencies before activation, including routes that have not been visited.
  const seen = new Set();
  while (resources.size) {
    const batch = [...resources].filter((path) => !seen.has(path));
    resources.clear();
    await Promise.all(batch.map(async (path) => {
      seen.add(path);
      const response = await fetch(publicRequest(path));
      if (!response.ok) throw new Error(`Public resource unavailable: ${path}`);
      if (path.endsWith(".css")) {
        buildResourcePaths(await response.clone().text(), path).forEach((resource) => {
          if (!seen.has(resource)) resources.add(resource);
        });
      }
      await cache.put(path, response);
    }));
  }
}

self.addEventListener("install", (event) => {
  // If any public page or dependency fails, the previous worker remains active.
  event.waitUntil(precachePublicSite());
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

async function offlineDocument(request) {
  const pathname = new URL(request.url).pathname;
  // Keep private routes out of the public application's router and its HTML cache.
  if (!PUBLIC_PATHS.has(pathname)) return Response.redirect(new URL("/", self.location.origin).href, 302);
  let offline;
  try {
    const cache = await caches.open(STATIC_CACHE);
    offline = await cache.match(pathname);
  } catch {
    // Storage may be disabled or evicted by the browser.
  }
  // An emergency page also works if the browser has evicted Cache Storage.
  return offline || new Response(
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Econolab</title><h1>Econolab</h1><p>El navegador eliminó la copia local. Conéctate una vez para recuperar las páginas del laboratorio.</p><p><a href="/">Reintentar conexión</a></p></html>',
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

async function networkDocument(request) {
  const pathname = new URL(request.url).pathname;
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
    if (response.status >= 500) return offlineDocument(request);
    if (PUBLIC_PATHS.has(pathname) && response.ok && !response.redirected && response.headers.get("content-type")?.includes("text/html")) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(pathname, response.clone());
      } catch { /* A storage failure must not break a successful public navigation. */ }
    }
    return response;
  } catch {
    return offlineDocument(request);
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
    const precached = await (await caches.open(STATIC_CACHE)).match(new URL(request.url).pathname);
    if (precached) return precached;
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
    // Only allowlisted public HTML is cached; authenticated HTML always uses the network.
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

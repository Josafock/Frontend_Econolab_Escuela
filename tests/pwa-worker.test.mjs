import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const ORIGIN = "https://econolab.test";
const STATIC_CACHE = "econolab-pwa-v1-static";
const ASSET_CACHE = "econolab-pwa-v1-assets";

function harness({ dev = false, fetcher = async () => new Response("network"), fastTimers = false, storageFailure } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const calls = { fetch: [], claimed: 0, skipWaiting: 0, opened: [], matched: [], windows: [] };
  const keyOf = (input) => new URL(typeof input === "string" ? input : input.url, ORIGIN).href;
  const cacheFor = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async match(input) {
        if (storageFailure === "match") throw new Error("Cache inaccessible");
        return entries.get(keyOf(input))?.clone();
      },
      async put(input, response) {
        if (storageFailure === "put") throw new Error("Storage quota exceeded");
        entries.set(keyOf(input), response.clone());
      },
      async delete(input) { return entries.delete(keyOf(input)); },
      async keys() { return [...entries.keys()].map((url) => new Request(url)); },
      async addAll(requests) {
        const responses = await Promise.all(requests.map(fetchResource));
        if (responses.some((response) => !response.ok)) throw new Error("Precache failed");
        requests.forEach((request, index) => entries.set(keyOf(request), responses[index].clone()));
      },
    };
  };
  async function fetchResource(request, options) {
    calls.fetch.push({ request, options });
    return fetcher(request, options);
  }
  const worker = {
    location: new URL(`/sw.js${dev ? "?dev=1" : ""}`, ORIGIN),
    addEventListener(name, callback) { listeners.set(name, callback); },
    async skipWaiting() { calls.skipWaiting++; },
    clients: {
      async claim() { calls.claimed++; },
      async matchAll(options) { calls.matched.push(options); return calls.windows; },
      async openWindow(url) { calls.opened.push(url); },
    },
  };
  class BrowserRequest extends Request {
    constructor(input, options) { super(typeof input === "string" ? new URL(input, ORIGIN) : input, options); }
  }
  vm.runInNewContext(source, {
    self: worker,
    fetch: fetchResource,
    caches: {
      async open(name) {
        if (storageFailure === "open") throw new Error("Cache Storage unavailable");
        return cacheFor(name);
      },
      async keys() { return [...stores.keys()]; },
      async delete(name) { return stores.delete(name); },
    },
    URL,
    Request: BrowserRequest,
    Response,
    AbortController,
    setTimeout: fastTimers ? (callback, ms) => setTimeout(callback, Math.min(ms, 5)) : setTimeout,
    clearTimeout,
  });

  function dispatch(name, data = {}) {
    let response;
    let pending = Promise.resolve();
    listeners.get(name)({
      ...data,
      respondWith(value) { response = Promise.resolve(value); },
      waitUntil(value) { pending = Promise.resolve(value); },
    });
    return { response, pending };
  }
  function fetchEvent(path, options = {}) {
    return dispatch("fetch", {
      request: {
        url: new URL(path, ORIGIN).href,
        method: options.method || "GET",
        mode: options.mode || "cors",
        headers: new Headers(options.headers),
      },
    });
  }
  return { calls, stores, cacheFor, dispatch, fetchEvent };
}

async function withOfflinePage(context) {
  await context.cacheFor(STATIC_CACHE).put("/offline.html", new Response("public offline guide"));
  return context;
}

test("install precaches only public static resources and waits for user-driven activation", async () => {
  const context = harness();
  await context.dispatch("install").pending;
  const urls = [...context.stores.get(STATIC_CACHE).keys()].map((url) => new URL(url).pathname);
  assert.ok(urls.includes("/offline.html"));
  assert.ok(urls.includes("/offline.css"));
  assert.ok(urls.includes("/offline.js"));
  assert.ok(urls.includes("/manifest.webmanifest"));
  assert.equal(urls.filter((url) => url.startsWith("/icons/")).length, 4);
  assert.ok(urls.every((url) => !url.startsWith("/api") && !url.startsWith("/servicios")));
  assert.equal(context.calls.skipWaiting, 0);
  assert.ok(context.calls.fetch.every(({ request }) => request.cache === "reload"));
});

test("a failed precache fails installation without skipping the current worker", async () => {
  const context = harness({ fetcher: async () => new Response("missing", { status: 404 }) });
  await assert.rejects(context.dispatch("install").pending, /Precache failed/);
  assert.equal(context.calls.skipWaiting, 0);
  assert.equal(context.stores.get(STATIC_CACHE).size, 0);
});

test("activate removes only old Econolab PWA caches and claims clients", async () => {
  const context = harness();
  context.cacheFor("econolab-pwa-v0-static");
  context.cacheFor("another-app-cache");
  context.cacheFor("econolab-patient-cache");
  context.cacheFor(STATIC_CACHE);
  context.cacheFor(ASSET_CACHE);
  await context.dispatch("activate").pending;
  assert.equal(context.stores.has("econolab-pwa-v0-static"), false);
  assert.equal(context.stores.has("another-app-cache"), true);
  assert.equal(context.stores.has("econolab-patient-cache"), true);
  assert.equal(context.stores.has(STATIC_CACHE), true);
  assert.equal(context.stores.has(ASSET_CACHE), true);
  assert.equal(context.calls.claimed, 1);
});

test("only the explicit update message activates a waiting worker", async () => {
  const context = harness();
  await context.dispatch("message", { data: { type: "OTHER" } }).pending;
  assert.equal(context.calls.skipWaiting, 0);
  await context.dispatch("message", { data: { type: "SKIP_WAITING" } }).pending;
  assert.equal(context.calls.skipWaiting, 1);
});

test("API, mutations, PDFs, external origins and Next RSC requests bypass the worker", () => {
  const context = harness();
  const excluded = [
    ["/api"],
    ["/api/services/1", { mode: "navigate" }],
    ["/servicios", { method: "POST", mode: "navigate" }],
    ["/servicios", { headers: { "next-action": "action-id" } }],
    ["/documentos/recibo.PDF", { mode: "navigate" }],
    ["/documentos/1", { headers: { accept: "application/pdf" }, mode: "navigate" }],
    ["https://backend.test/services/1", { mode: "navigate" }],
    ["/servicios?_rsc=123", { mode: "navigate" }],
    ["/servicios", { headers: { RSC: "1" }, mode: "navigate" }],
    ["/servicios", { headers: { accept: "text/x-component" }, mode: "navigate" }],
    ["/pacientes", { mode: "cors" }],
    ["/_next/image?url=private-image.png"],
    ["/session.json"],
  ];
  for (const [path, options] of excluded) {
    assert.equal(context.fetchEvent(path, options).response, undefined, path);
  }
  assert.equal(context.calls.fetch.length, 0);
  assert.equal(context.stores.size, 0);
});

test("a private document comes from the network and is never written to Cache Storage", async () => {
  const context = harness({ fetcher: async () => new Response("private patient data") });
  const response = await context.fetchEvent("/pacientes/detalle?id=7", { mode: "navigate" }).response;
  assert.equal(await response.text(), "private patient data");
  assert.equal(context.stores.size, 0);
});

test("offline navigation to any app page receives the public guide", async () => {
  const context = await withOfflinePage(harness({ fetcher: async () => { throw new TypeError("offline"); } }));
  for (const path of ["/home", "/servicios/detalle?id=42", "/pacientes", "/login"]) {
    const response = await context.fetchEvent(path, { mode: "navigate" }).response;
    assert.equal(await response.text(), "public offline guide");
  }
  assert.equal(context.stores.get(STATIC_CACHE).size, 1);
});

test("server errors use the public guide but authentication and 404 responses remain intact", async () => {
  for (const status of [500, 502, 503, 401, 403, 404]) {
    const context = await withOfflinePage(harness({ fetcher: async () => new Response("server response", { status }) }));
    const response = await context.fetchEvent("/home", { mode: "navigate" }).response;
    assert.equal(await response.text(), status >= 500 ? "public offline guide" : "server response");
    if (status < 500) assert.equal(response.status, status);
  }
});

test("a stalled navigation times out and returns the guide", async () => {
  const context = await withOfflinePage(harness({ fetcher: () => new Promise(() => {}), fastTimers: true }));
  const response = await context.fetchEvent("/home", { mode: "navigate" }).response;
  assert.equal(await response.text(), "public offline guide");
  assert.equal(context.calls.fetch[0].options.signal.aborted, true);
});

test("cache eviction still provides a minimal accessible offline document", async () => {
  const context = harness({ fetcher: async () => { throw new TypeError("offline"); } });
  const response = await context.fetchEvent("/home", { mode: "navigate" }).response;
  assert.match(response.headers.get("content-type"), /text\/html/);
  assert.match(await response.text(), /Reintentar conexión/);
});

test("preloaded guide assets resolve without network even when requested with query strings", async () => {
  const context = harness({ fetcher: async () => { throw new TypeError("offline"); } });
  await context.cacheFor(STATIC_CACHE).put("/offline.css", new Response("body { color: red; }"));
  const response = await context.fetchEvent("/offline.css?v=1").response;
  assert.equal(await response.text(), "body { color: red; }");
  assert.equal(context.calls.fetch.length, 0);
});

test("only production Next static assets are cached and remain available offline", async () => {
  let online = true;
  const context = harness({ fetcher: async () => {
    if (!online) throw new TypeError("offline");
    return new Response("compiled asset");
  } });
  const path = "/_next/static/chunks/build-abc.js";
  assert.equal(await (await context.fetchEvent(path).response).text(), "compiled asset");
  online = false;
  assert.equal(await (await context.fetchEvent(path).response).text(), "compiled asset");
  assert.equal(context.calls.fetch.length, 1);
  assert.equal(context.stores.get(ASSET_CACHE).size, 1);
  const development = harness({ dev: true });
  assert.equal(development.fetchEvent(path).response, undefined);
  assert.equal(development.stores.size, 0);
});

test("failed or explicitly private static responses are not cached", async () => {
  for (const options of [{ status: 500 }, { headers: { "cache-control": "private" } }, { headers: { "cache-control": "no-store" } }]) {
    const context = harness({ fetcher: async () => new Response("not cacheable", options) });
    await context.fetchEvent("/_next/static/chunks/a.js").response;
    assert.equal(context.stores.get(ASSET_CACHE).size, 0);
  }
});

test("storage failures never replace successful network resources with errors", async () => {
  for (const storageFailure of ["open", "match", "put"]) {
    const context = harness({ storageFailure });
    for (const path of ["/offline.css", "/_next/static/chunks/a.js"]) {
      const response = await context.fetchEvent(path).response;
      assert.equal(await response.text(), "network", `${storageFailure}: ${path}`);
    }
  }
});

test("offline navigation with inaccessible Cache Storage still returns the emergency guide", async () => {
  for (const storageFailure of ["open", "match"]) {
    const context = harness({ storageFailure, fetcher: async () => { throw new TypeError("offline"); } });
    const response = await context.fetchEvent("/pacientes", { mode: "navigate" }).response;
    assert.match(await response.text(), /Econolab sin conexión/);
  }
});

test("runtime assets are bounded to avoid unlimited disk usage", async () => {
  const context = harness();
  for (let index = 0; index < 102; index++) {
    await context.fetchEvent(`/_next/static/chunks/${index}.js`).response;
  }
  const entries = context.stores.get(ASSET_CACHE);
  assert.equal(entries.size, 100);
  assert.equal(entries.has(`${ORIGIN}/_next/static/chunks/0.js`), false);
  assert.equal(entries.has(`${ORIGIN}/_next/static/chunks/101.js`), true);
});

function click(context, url) {
  let closed = false;
  const event = context.dispatch("notificationclick", {
    notification: { data: { url }, close() { closed = true; } },
  });
  assert.equal(closed, true);
  return event.pending;
}

test("notification opens only a same-origin destination and rejects unsafe URLs", async () => {
  for (const unsafe of ["https://evil.test/steal", "//evil.test/steal", "javascript:alert(1)", "data:text/html,hello", "https://user:pass@econolab.test/home", "http://[invalid", undefined]) {
    const context = harness();
    await click(context, unsafe);
    assert.deepEqual(context.calls.opened, [`${ORIGIN}/home`]);
  }
  const context = harness();
  await click(context, "/servicios?pending=1");
  assert.deepEqual(context.calls.opened, [`${ORIGIN}/servicios?pending=1`]);
});

test("notification focuses the matching app tab without navigating other origins", async () => {
  const context = harness();
  let focused = 0;
  context.calls.windows = [
    { url: "https://evil.test/home", focus() { throw new Error("wrong origin"); } },
    { url: `${ORIGIN}/servicios`, async focus() { focused++; } },
  ];
  await click(context, "/servicios");
  assert.equal(focused, 1);
  assert.equal(context.calls.opened.length, 0);
});

test("notification navigates an existing app tab and falls back if it has closed", async () => {
  const context = harness();
  const navigations = [];
  let focused = 0;
  context.calls.windows = [{
    url: `${ORIGIN}/home`,
    async navigate(url) { navigations.push(url); },
    async focus() { focused++; },
  }];
  await click(context, "/servicios");
  assert.deepEqual(navigations, [`${ORIGIN}/servicios`]);
  assert.equal(focused, 1);
  assert.equal(context.calls.opened.length, 0);

  context.calls.windows = [{ url: `${ORIGIN}/home`, async navigate() { throw new Error("closed"); } }];
  await click(context, "/servicios");
  assert.deepEqual(context.calls.opened, [`${ORIGIN}/servicios`]);
});

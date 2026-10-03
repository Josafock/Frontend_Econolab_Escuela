import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { test } from "node:test";
import ts from "typescript";

function loadModule(relativePath, imports, globals = {}) {
  const filename = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    fileName: filename,
  });
  const exports = {};
  vm.runInNewContext(compiled.outputText, {
    exports,
    require(name) {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
    ...globals,
  }, { filename });
  return exports;
}

function clientHarness(options = {}) {
  const storage = options.storage ?? new Map();
  const notifications = [];
  const Notification = { permission: "granted" };
  const registration = {
    active: options.activeWorker !== false,
    showNotification: async (title, config) => notifications.push({ title, ...config }),
  };
  const navigator = {
    userAgent: "TestBrowser",
    platform: "Win32",
    maxTouchPoints: 0,
    serviceWorker: { getRegistration: async () => registration },
  };
  const ServiceWorkerRegistration = { prototype: { showNotification() {} } };
  const api = loadModule("src/lib/pwa/notifications.ts", {
    "@/actions/notifications/serviceReminders": {
      isNotificationSessionActive: options.authenticated ?? (async () => true),
    },
    "@/lib/routes/detail-routes": {
      buildServiceDetailHref: (id) => `/servicios/detalle?id=${id}`,
    },
  }, {
    navigator, Notification, ServiceWorkerRegistration, Event,
    window: {
      isSecureContext: true, Notification, ServiceWorkerRegistration,
      matchMedia: () => ({ matches: false }), dispatchEvent() {},
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
  });
  return { api, storage, notifications, Notification, navigator };
}

test("notifications require opt-in, browser permission, and the active user's session", async () => {
  const { api, notifications, Notification } = clientHarness();
  const session = api.activateNotificationSession("a");
  assert.equal(await api.notifyResultFinalized(42, session), "disabled");
  api.setNotificationsEnabled("b", true);
  assert.equal(await api.notifyResultFinalized(42, session), "disabled");
  api.setNotificationsEnabled("a", true);
  Notification.permission = "denied";
  assert.equal(await api.notifyResultFinalized(42, session), "disabled");
  Notification.permission = "granted";
  assert.equal(await api.notifyResultFinalized(42, session), "sent");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].data.url, "/servicios/detalle?id=42");
  api.deactivateNotificationSession(session);
  assert.equal(await api.notifyResultFinalized(42, session), "disabled");
});

test("a changed server session or missing worker prevents delivery", async () => {
  for (const options of [{ authenticated: async () => false }, { activeWorker: false }]) {
    const { api, notifications } = clientHarness(options);
    const session = api.activateNotificationSession("a");
    api.setNotificationsEnabled("a", true);
    assert.notEqual(await api.notifyResultFinalized(42, session), "sent");
    assert.equal(notifications.length, 0);
  }
});

test("an in-flight notification is discarded after logout or changing users", async () => {
  let resolveAuth;
  let authStarted;
  const started = new Promise((resolve) => { authStarted = resolve; });
  const { api, notifications } = clientHarness({
    authenticated: () => {
      authStarted();
      return new Promise((resolve) => { resolveAuth = resolve; });
    },
  });
  const previous = api.activateNotificationSession("a");
  api.setNotificationsEnabled("a", true);
  const delivery = api.notifyResultFinalized(42, previous);
  await started;
  api.activateNotificationSession("b");
  resolveAuth(true);
  assert.equal(await delivery, "disabled");
  assert.equal(notifications.length, 0);
});

test("deduplication persists and stays isolated by user and deadline", () => {
  const first = clientHarness();
  const keys = ["42:2026-10-03T12:00:00Z:soon"];
  first.api.rememberNotificationKeys("a", keys);
  const reopened = clientHarness({ storage: first.storage });
  assert.equal(reopened.api.unseenReminderKeys("a", keys).length, 0);
  assert.equal(reopened.api.unseenReminderKeys("b", keys).length, 1);
  assert.equal(reopened.api.unseenReminderKeys("a", ["42:2026-10-04T12:00:00Z:soon"]).length, 1);
  assert.equal(reopened.api.unseenReminderKeys("a", ["42:2026-10-03T12:00:00Z:overdue"]).length, 1);
});

function serverHarness(getServices, actualUser = "a") {
  return loadModule("src/actions/notifications/serviceReminders.ts", {
    "next/headers": { cookies: async () => ({ get: () => ({ value: "test-token" }) }) },
    jose: { jwtVerify: async () => ({ payload: { id: actualUser } }) },
    "@/schemas": { userSchema: { safeParse: (payload) => ({ success: true, data: payload }) } },
    "@/features/services/api/services": { getServices },
  }, { TextEncoder, process: { env: { JWT_SECRET: "test-secret" } } });
}

test("reminder queries reject stale users before accessing services", async () => {
  let requests = 0;
  const api = serverHarness(async () => { requests += 1; }, "b");
  assert.equal((await api.getServiceReminders("a")).reason, "session");
  assert.equal(requests, 0);
});

test("reminder queries exclude completed/cancelled and return no patient or clinical data", async () => {
  const api = serverHarness(async ({ status }) => ({
    ok: true,
    data: {
      data: [
        { id: 1, status, deliveryAt: "2026-10-03T12:00:00Z", patient: { name: "Private" }, items: ["Private"] },
        { id: 2, status: "completed", deliveryAt: "2026-10-03T12:00:00Z" },
        { id: 3, status: "cancelled", deliveryAt: "2026-10-03T12:00:00Z" },
        { id: 4, status, completedAt: "2026-10-03T12:00:00Z", deliveryAt: "2026-10-03T12:00:00Z" },
        { id: 5, status, deliveryAt: "invalid" },
      ],
      meta: { total: 5 },
    },
  }));
  const result = await api.getServiceReminders("a");
  assert.equal(result.ok, true);
  assert.equal(result.reminders.length, 3);
  for (const item of result.reminders) {
    assert.equal(item.id, 1);
    assert.deepEqual(Object.keys(item), ["id", "deliveryAt"]);
  }
});

test("reminder scans stop at six requests even with a large catalog", async () => {
  const requests = [];
  const api = serverHarness(async (params) => {
    requests.push(params);
    return { ok: true, data: { data: [], meta: { total: 50000 } } };
  });
  const result = await api.getServiceReminders("a");
  assert.equal(result.ok, true);
  assert.equal(result.truncated, true);
  assert.equal(requests.length, 6);
  assert.ok(requests.every(({ page, limit }) => page <= 2 && limit === 100));
});

test("failed service queries do not generate incomplete reminders", async () => {
  const api = serverHarness(async () => ({ ok: false, errors: ["unavailable"] }));
  const result = await api.getServiceReminders("a");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "connection");
});

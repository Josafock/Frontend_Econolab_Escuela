import { expect, test, type Page } from "@playwright/test";

async function prepareOffline(page: Page) {
  await page.goto("/auth/login");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.locator("summary").filter({ hasText: "Instalar Econolab" }).click();
  await expect(page.getByText("Guía sin conexión disponible en este dispositivo.")).toBeVisible();
}

test("manifest, iconos y metadatos permiten instalar la aplicación", async ({ page, request }) => {
  await prepareOffline(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#dc2626");
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", scope: "/", start_url: "/home", display: "standalone", lang: "es-MX" });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("192x192");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toContain("512x512");
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async (src: string) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return `${image.naturalWidth}x${image.naturalHeight}`;
    }, icon.src);
    expect(dimensions).toBe(icon.sizes);
  }
  const worker = await request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["service-worker-allowed"]).toBe("/");
});

test("el arranque offline y la navegación conservan la guía y su diseño", async ({ page, context }, testInfo) => {
  await prepareOffline(page);
  await context.setOffline(true);
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu guía del laboratorio, siempre a mano.");
  await expect(page.locator("#connection-status")).toContainText(/sin conexión/i);
  await page.getByRole("link", { name: "Capturar resultados", exact: true }).click();
  await expect(page).toHaveURL(/#resultados$/);
  expect(await page.locator(".card").first().evaluate((element) => getComputedStyle(element).borderRadius)).not.toBe("0px");
  expect(await page.locator(".brand img").evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("guia-offline.png"), fullPage: true });
  // Una ruta nunca visitada también recibe la guía, sin recuperar HTML clínico.
  await page.goto("/servicios/detalle?id=123");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu guía del laboratorio, siempre a mano.");
  await page.reload();
  await expect(page.locator("#services-title")).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("link", { name: "Reintentar abrir Econolab" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("la caché excluye sesión, API, HTML dinámico y resultados", async ({ page }) => {
  await prepareOffline(page);
  await page.evaluate(async () => {
    await fetch("/auth/login");
    await fetch("/api/files/services/123/receipt");
  });
  const cached = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith("econolab-"));
    return (await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)))).flat();
  });
  expect(cached).toContain("/offline.html");
  expect(cached).toContain("/offline.css");
  expect(cached.some((path) => path.startsWith("/api/") || path.startsWith("/auth/") || path.startsWith("/servicios"))).toBe(false);
});

test("el botón de instalación usa el diálogo del navegador cuando está disponible", async ({ page }) => {
  await prepareOffline(page);
  // El navegador/OS decide la instalación real. Aquí verificamos el contrato del evento.
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page.getByRole("button", { name: "Instalar aplicación", exact: true }).click();
  await expect(page.getByText("Puedes instalar Econolab más tarde desde el menú del navegador.")).toBeVisible();
});

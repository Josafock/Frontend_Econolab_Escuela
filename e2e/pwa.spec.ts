import { expect, test, type Page } from "@playwright/test";
import { useTestSession } from "./session";

async function prepareOffline(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.locator("summary").filter({ hasText: "Instalar Econolab" }).click();
  await expect(page.getByText("Páginas públicas disponibles sin conexión en este dispositivo.")).toBeVisible();
}

test("manifest, iconos y metadatos permiten instalar la aplicación", async ({ page, request }) => {
  await prepareOffline(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#dc2626");
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest).toMatchObject({ id: "/", scope: "/", start_url: "/", display: "standalone", lang: "es-MX" });
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

test("las cuatro páginas públicas se precargan y navegan completas sin conexión", async ({ page, context }, testInfo) => {
  await prepareOffline(page);
  const failedResources: string[] = [];
  page.on("requestfailed", (request) => { if (new URL(request.url()).pathname.startsWith("/_next/static/")) failedResources.push(request.url()); });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cerca de ti.");
  for (const [label, path, heading] of [
    ["Nosotros", "/nosotros", "El laboratorio detrás de cada estudio."],
    ["Servicios", "/servicios-laboratorio", "Información para preparar tu visita."],
    ["Contacto", "/contacto", "Ponte en contacto con Econolab."],
    ["Inicio", "/", "Cerca de ti."],
  ]) {
    await page.getByRole("navigation", { name: "Navegación pública" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
    await expect(page.getByText("Sin conexión. Puedes recorrer las páginas públicas; el sistema necesita conexión.")).toBeVisible();
  }
  expect(await page.locator("header img").evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await page.locator("header").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(255, 255, 255)");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("inicio-publico-offline.png"), fullPage: true });
  // Sin red, las rutas privadas vuelven al sitio público y no muestran datos clínicos.
  await page.goto("/servicios/detalle?id=123");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cerca de ti.");
  await page.reload();
  expect(failedResources).toEqual([]);
  await context.setOffline(false);
  await page.locator("header").getByRole("link", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test("la entrada pública muestra login y registro directo y recibe la entrada anterior sin sesión", async ({ page, context }, testInfo) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cerca de ti.");
  await expect(page.locator("header").getByRole("link", { name: "Iniciar sesión", exact: true })).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "Registrarse", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: testInfo.outputPath("entrada-publica.png") });
  await page.locator("header").getByRole("link", { name: "Registrarse", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.getByRole("button", { name: "Crear cuenta", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Volver al sitio público", exact: true }).click();
  await page.locator("header").getByRole("link", { name: "Iniciar sesión", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
  // Las otras rutas internas conservan el control de sesión.
  await page.goto("/estudios");
  await expect(page).toHaveURL(/\/auth\/login$/);
  await context.addCookies([{ name: "ECONOLAB_TOKEN", value: "invalid-expired-token", url: "http://localhost:5183", httpOnly: true }]);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/$/);
});

test("con sesión el panel funciona y cerrar sesión vuelve al sitio público", async ({ page, context }) => {
  await useTestSession(context);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cerca de ti.");
  await page.goto("/home");
  await expect(page.getByRole("heading", { name: "Panel operativo listo para tu jornada" })).toBeVisible();
  const mobileMenu = page.getByRole("button", { name: "Abrir menu lateral", exact: true });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await page.getByRole("button", { name: "Cerrar sesion", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await context.cookies()).some((cookie) => cookie.name === "ECONOLAB_TOKEN")).toBe(false);
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
  for (const path of ["/", "/nosotros", "/servicios-laboratorio", "/contacto"]) expect(cached).toContain(path);
  expect(cached).not.toContain("/offline.html");
  expect(cached.some((path) => path.startsWith("/api/") || path.startsWith("/auth/") || path === "/servicios" || path.startsWith("/servicios/"))).toBe(false);
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

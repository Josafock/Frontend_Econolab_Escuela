import { expect, test, type Page } from "@playwright/test";
import { useTestSession } from "./session";

async function openScanner(page: Page) {
  await page.goto("/servicios");
  await page.getByRole("button", { name: "Escanear recibo", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Escanear recibo" })).toBeVisible();
}

test.beforeEach(async ({ context }) => { await useTestSession(context); });

test("permiso de cámara rechazado conserva el folio manual", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => { throw new DOMException("Denied by test", "NotAllowedError"); },
    });
  });
  await openScanner(page);
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "No se autorizó la cámara" })).toBeVisible();
  await page.getByLabel("También puedes escribir el folio").fill("https://otro-sitio.example");
  await page.getByRole("button", { name: "Abrir servicio", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(/folio|recibo/i);
  await page.screenshot({ path: testInfo.outputPath("lector-recibos.png"), fullPage: true });
  await page.getByRole("button", { name: "Cerrar lector de recibos" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cámara se pide sólo al activarla y libera el video al cerrar", async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { cameraRequests: number; cameraTrack?: MediaStreamTrack };
    testWindow.cameraRequests = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        testWindow.cameraRequests += 1;
        const canvas = document.createElement("canvas");
        canvas.width = 640; canvas.height = 480;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "white"; ctx.fillRect(0, 0, 640, 480);
        const stream = canvas.captureStream(10);
        testWindow.cameraTrack = stream.getVideoTracks()[0];
        return stream;
      },
    });
  });
  await openScanner(page);
  expect(await page.evaluate(() => (window as typeof window & { cameraRequests: number }).cameraRequests)).toBe(0);
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Acerca el código de barras" })).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { cameraTrack: MediaStreamTrack }).cameraTrack.readyState)).toBe("live");
  await page.getByRole("button", { name: "Cerrar lector de recibos" }).click();
  expect(await page.evaluate(() => (window as typeof window & { cameraTrack: MediaStreamTrack }).cameraTrack.readyState)).toBe("ended");
});

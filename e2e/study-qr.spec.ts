import { expect, test } from "@playwright/test";
import { useTestSession } from "./session";

test.beforeEach(async ({ context }) => { await useTestSession(context); });

test("cada estudio tiene QR descargable y el lector real abre el estudio correcto", async ({ page }, testInfo) => {
  await page.goto("/estudios/detalle?id=41");
  await page.getByRole("button", { name: "Ver QR", exact: true }).click();
  const qr = page.getByRole("dialog", { name: "QR del estudio" });
  const image = qr.getByRole("img", { name: "Código QR del estudio QR-041" });
  await expect(image).toBeVisible();
  const src = await image.getAttribute("src");
  expect(src).toMatch(/^data:image\/png;base64,/);
  await expect(qr.getByRole("link", { name: "Descargar QR" })).toHaveAttribute("download", "econolab-estudio-41-qr.png");
  await page.screenshot({ path: testInfo.outputPath("qr-del-estudio.png") });
  await page.getByRole("button", { name: "Cerrar QR del estudio" }).click();
  await page.goto("/estudios");
  await page.evaluate((qrImage) => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 480;
        const context = canvas.getContext("2d")!;
        context.fillStyle = "white"; context.fillRect(0, 0, 640, 480);
        const image = new Image(); image.src = qrImage!; await image.decode();
        context.drawImage(image, 140, 60, 360, 360);
        const stream = canvas.captureStream(10);
        (window as typeof window & { qrCameraTrack: MediaStreamTrack }).qrCameraTrack = stream.getVideoTracks()[0];
        return stream;
      },
    });
  }, src);
  await page.getByRole("button", { name: "Escanear QR", exact: true }).click();
  await page.getByRole("button", { name: "Activar cámara" }).click();
  await expect(page).toHaveURL(/\/estudios\/detalle\?id=41/);
  await expect(page.locator("#resumen-estudio").getByText("ESTUDIO QR DE PRUEBA", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { qrCameraTrack: MediaStreamTrack }).qrCameraTrack.readyState)).toBe("ended");
});

test("lector QR rechaza enlaces y maneja estudios eliminados", async ({ page }) => {
  await page.goto("/estudios");
  await page.getByRole("button", { name: "Escanear QR", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Escanear QR de estudio" });
  await scanner.getByLabel("También puedes pegar el contenido del QR").fill("https://otro-sitio.example");
  await scanner.getByRole("button", { name: "Abrir estudio", exact: true }).click();
  await expect(scanner.getByRole("alert")).toContainText("Este QR no corresponde a un estudio");
  await scanner.getByLabel("También puedes pegar el contenido del QR").fill("econolab:study:999");
  await scanner.getByRole("button", { name: "Abrir estudio", exact: true }).click();
  await expect(scanner.getByRole("alert")).toContainText("Estudio no encontrado.");
  await expect(page).toHaveURL(/\/estudios$/);
});

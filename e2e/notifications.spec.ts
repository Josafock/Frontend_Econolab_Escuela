import { expect, test } from "@playwright/test";
import { useTestSession } from "./session";

test("notificaciones requieren activación, se muestran mediante el worker y se pueden apagar", async ({ page, context }) => {
  await useTestSession(context);
  await context.grantPermissions(["notifications"]);
  await page.goto("/home");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await page.locator("summary").filter({ hasText: "Instalar Econolab" }).click();
  await page.locator("summary").filter({ hasText: "Avisos de entregas" }).click();
  await expect(page.getByRole("button", { name: "Enviar prueba" })).toHaveCount(0);
  await page.getByRole("button", { name: "Activar avisos", exact: true }).click();
  await page.getByRole("button", { name: "Enviar prueba" }).click();
  await expect(page.getByText(/^Prueba enviada\./)).toBeVisible();
  const notifications = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const notices = await registration!.getNotifications();
    return notices.map((notification) => ({ title: notification.title, body: notification.body, url: notification.data.url }));
  });
  expect(notifications).toContainEqual({
    title: "Econolab: avisos activados",
    body: "Recibirás avisos sobre entregas y resultados mientras uses la aplicación.",
    url: "/servicios",
  });
  await page.getByRole("button", { name: "Desactivar avisos" }).click();
  await expect(page.getByRole("button", { name: "Enviar prueba" })).toHaveCount(0);
  await expect(page.getByText("Avisos desactivados para tu cuenta en este dispositivo.")).toBeVisible();
});

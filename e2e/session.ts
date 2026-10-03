import { SignJWT } from "jose";
import type { BrowserContext } from "@playwright/test";

// Sólo funciona contra el servidor aislado de playwright.config.ts.
// Ese servidor usa una API inexistente: estas pruebas nunca escriben en la BD.
export async function useTestSession(context: BrowserContext) {
  const token = await new SignJWT({ sub: "pwa-test", nombre: "Prueba PWA", email: "pwa@example.test", rol: "recepcionista" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode("econolab-pwa-isolated-browser-test-only"));
  await context.addCookies([{ name: "ECONOLAB_TOKEN", value: token, url: "http://localhost:5183", httpOnly: true, sameSite: "Lax" }]);
}

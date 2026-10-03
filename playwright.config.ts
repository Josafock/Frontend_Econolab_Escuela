import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:5183",
    trace: "retain-on-failure",
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- -p 5183",
    url: "http://localhost:5183/auth/login",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      JWT_SECRET: "econolab-pwa-isolated-browser-test-only",
      API_URL: "http://127.0.0.1:1/api",
    },
  },
});

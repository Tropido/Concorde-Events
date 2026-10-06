import { defineConfig, devices } from "@playwright/test";

// Browser checks against `next dev` + the TEST Supabase project (.env.local must point at it,
// .env.test.local provides the secret key used to create throwaway users).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", locale: "fr-FR" },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /layout\.spec\.ts/ },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});

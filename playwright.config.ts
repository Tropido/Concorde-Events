import { defineConfig, devices } from "@playwright/test";

// Browser checks against `next dev` + the TEST Supabase project (.env.local must point at it,
// .env.test.local provides the secret key used to create throwaway users).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  // next dev compiles each route on first visit; give assertions room for that.
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3210", trace: "retain-on-failure", locale: "fr-FR" },
  projects: [
    { name: "laptop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /layout\.spec\.ts/ },
  ],
  // Dedicated port, never reuse: another local app on :3000 must not be tested by mistake.
  webServer: { command: "npx next dev -p 3210", url: "http://localhost:3210", reuseExistingServer: false, timeout: 180_000,
    // Local networks without IPv6 + Node 250 ms per-attempt connect timeout = sporadic ETIMEDOUT to Supabase.
    env: { NODE_OPTIONS: "--network-family-autoselection-attempt-timeout=1500" } },
});

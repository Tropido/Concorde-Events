import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": import.meta.dirname } },
  test: { include: ["tests/integration/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 120_000 },
});

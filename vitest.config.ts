import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    restoreMocks: true,
    setupFiles: ["./tests/setup-env.ts"],
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "playwright/**", "node_modules/**", ".tmp/**"],
  },
});

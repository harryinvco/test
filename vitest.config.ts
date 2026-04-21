import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    env: {
      AUTH_SECRET: "test-secret-value-at-least-32-chars!!",
      ADMIN_EMAIL: "test@example.com",
      ADMIN_PASSWORD_HASH: "$2a$10$test",
      TURSO_DATABASE_URL: "libsql://test.turso.io",
      TURSO_AUTH_TOKEN: "test-token",
      ANTHROPIC_API_KEY: "sk-ant-test-key-xxxxxxxxxxxxxxxxxxxx",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/__tests__/server-only-stub.ts"),
    },
  },
});

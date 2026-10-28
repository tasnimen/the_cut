import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export default defineConfig({
  resolve: { alias: {
    "@": resolve(fileURLToPath(new URL(".", import.meta.url)), "src"),
    "server-only": resolve(fileURLToPath(new URL(".", import.meta.url)), "src/test/server-only.js"),
  } },
  test: { environment: "node", include: ["src/**/*.test.js"] },
});

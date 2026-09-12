import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // El mismo alias de tsconfig.json, para que las pruebas importen igual
    // que la app.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@inbox/api-client": alias("../../packages/api-client/src/index.ts"),
      "@inbox/api-client/types": alias("../../packages/api-client/src/types.ts"),
      "@inbox/ui-core": alias("../../packages/ui-core/src/index.ts"),
      "@inbox/locales/ru": alias("../../packages/locales/ru.json"),
      "@inbox/locales/en": alias("../../packages/locales/en.json"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: "../../.env.local", quiet: true });
config({ path: "../../.env", quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
  },
});

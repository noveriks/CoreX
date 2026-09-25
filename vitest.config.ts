import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@main": path.resolve(__dirname, "src/main"),
      "@": path.resolve(__dirname, "src/renderer/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
})

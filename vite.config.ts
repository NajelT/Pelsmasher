import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080"
    }
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "http://127.0.0.1:5173/"
      }
    },
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});

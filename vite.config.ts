import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "./frontend",
  resolve: {
    alias: {
      // Use path.resolve with a relative path from the project root.
      // This is simpler and avoids ESM/CJS issues with __dirname.
      "@": path.resolve("./frontend/src"),
    },
  },
  server: {
    host: "0.0.0.0",
    // No proxy needed when backend serves frontend directly
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "..", "apps", "frontend", "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "packages", "shared"),
    },
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: [
      'pdfjs-dist',
      'mammoth',
      'tesseract.js',
      'sharp',
      'scribe.js-ocr',
      'html2canvas',
      'jspdf',
      'xlsx',
      'marked',
      'highlight.js',
      'prettier',
      'monaco-editor',
      'chart.js',
      'rxjs'
    ]
  },
  publicDir: path.resolve(import.meta.dirname, "..", "apps", "frontend", "public"),
  root: path.resolve(import.meta.dirname, "..", "apps", "frontend"),
  build: {
    target: 'esnext',
    outDir: path.resolve(import.meta.dirname, "..", "dist", "public"),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'pdfjs-dist',
        'mammoth',
        'tesseract.js',
        'sharp',
        'scribe.js-ocr',
        'html2canvas',
        'jspdf',
        'xlsx',
        'marked',
        'highlight.js',
        'prettier',
        'monaco-editor',
        'chart.js',
        'rxjs'
      ]
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

// ═══════════════════════════════════════════════════════════════
// VITE CONFIG — UptimeOps
// Vite 7 + React 19 + TypeScript + Tailwind + Sentry
// Production: Code splitting, asset optimization, Sentry source maps
// ═══════════════════════════════════════════════════════════════

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  const enableSentry = isProd && env.VITE_SENTRY_DSN;

  return {
    base: "/",
    
    plugins: [
      react(),
      // Sentry source maps upload (production only)
      enableSentry && sentryVitePlugin({
        org: env.VITE_SENTRY_ORG,
        project: env.VITE_SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ["**/*.js.map"],
        },
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@lib": path.resolve(__dirname, "./src/lib"),
        "@types": path.resolve(__dirname, "./src/types"),
      },
    },

    server: {
      port: 3000,
      host: true,
      strictPort: false,
      open: false,
      cors: {
        origin: ["http://localhost:3000", "http://localhost:54321"],
        credentials: true,
      },
    },

    preview: {
      port: 4173,
      host: true,
    },

    build: {
      target: "es2022",
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: isProd ? "hidden" : true,
      
      // Code splitting optimization
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            "react-core": ["react", "react-dom", "react-router-dom"],
            // UI Framework
            "ui-framework": ["@radix-ui/react-dialog", "@radix-ui/react-tabs", "@radix-ui/react-tooltip"],
            // shadcn/ui components (bulk)
            "shadcn": [
              "class-variance-authority",
              "clsx",
              "tailwind-merge",
              "lucide-react",
            ],
            // Charts
            charts: ["recharts"],
            // 3D / Animation
            "3d": ["three", "gsap", "postprocessing"],
            // Forms
            forms: ["react-hook-form", "zod", "@hookform/resolvers"],
            // Supabase
            supabase: ["@supabase/supabase-js"],
            // Data
            data: ["@tanstack/react-query", "zustand"],
          },
        },
      },

      // Chunk size warning
      chunkSizeWarningLimit: 500,

      // Minification (uses esbuild by default)
    },

    // CSS
    css: {
      devSourcemap: true,
    },

    // Environment variable prefix
    envPrefix: "VITE_",

    // Optimize dependencies for faster dev
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@supabase/supabase-js",
        "@tanstack/react-query",
        "zustand",
        "recharts",
        "lucide-react",
      ],
      exclude: ["@xterm/xterm", "monaco-editor"],
    },

    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || "1.0.0"),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  };
});

// ═══════════════════════════════════════════════════════════════
// VITE CONFIG — UptimeOps
// Vite 7 + React 19 + TypeScript + Tailwind
// Production: Code splitting, asset optimization
// ═══════════════════════════════════════════════════════════════

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    base: "/",
    
    plugins: [
      react(),
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
          manualChunks: (id: string) => {
            if (id.includes("node_modules")) {
              if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
                return "react-core";
              }
              if (id.includes("@radix-ui")) {
                return "ui-framework";
              }
              if (id.includes("recharts")) {
                return "charts";
              }
              if (id.includes("three") || id.includes("gsap") || id.includes("postprocessing")) {
                return "3d";
              }
              if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) {
                return "forms";
              }
              if (id.includes("@supabase")) {
                return "supabase";
              }
              if (id.includes("@tanstack") || id.includes("zustand")) {
                return "data";
              }
              if (
                id.includes("class-variance-authority") ||
                id.includes("tailwind-merge") ||
                id.includes("lucide-react")
              ) {
                return "ui-utils";
              }
              return "vendor";
            }
          },
        },
      },

      // Chunk size warning
      chunkSizeWarningLimit: 500,
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

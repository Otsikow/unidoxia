import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    server: {
      host: "127.0.0.1",
      port: 8080,
    },

    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Force ESM lodash build (required for recharts + tree-shaking)
        lodash: "lodash-es",
      },
    },

    build: {
      // Source maps only in development
      sourcemap: !isProd,

      // Target modern browsers
      target: "esnext",

      // Chunk warning threshold
      chunkSizeWarningLimit: 1000,

      // CSS optimizations
      cssCodeSplit: true,
      cssMinify: true,

      // Fast + effective minification
      minify: isProd ? "esbuild" : false,

      // Faster builds (you already analyze bundles separately)
      reportCompressedSize: false,

      // Modern preload behavior
      modulePreload: {
        polyfill: true,
      },

      rollupOptions: {
        output: {
          manualChunks: {
            // Core React
            "vendor-react": ["react", "react-dom", "react-router-dom"],

            // Radix UI (split for parallel loading)
            "vendor-radix-core": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-slot",
            ],
            "vendor-radix-extra": [
              "@radix-ui/react-accordion",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-avatar",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-label",
              "@radix-ui/react-progress",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-separator",
              "@radix-ui/react-switch",
              "@radix-ui/react-toast",
              "@radix-ui/react-toggle",
            ],

            // Data + backend
            "vendor-query": [
              "@tanstack/react-query",
              "@supabase/supabase-js",
            ],

            // Animations (only when needed)
            "vendor-animation": ["framer-motion"],

            // Charts (dashboard only)
            "vendor-charts": ["recharts"],

            // Rich text editor (blog/admin only)
            "vendor-editor": [
              "@tiptap/react",
              "@tiptap/starter-kit",
              "@tiptap/extension-link",
              "@tiptap/extension-image",
              "@tiptap/extension-placeholder",
            ],

            // i18n
            "vendor-i18n": [
              "i18next",
              "react-i18next",
              "i18next-browser-languagedetector",
            ],

            // Utilities
            "vendor-utils": [
              "date-fns",
              "clsx",
              "tailwind-merge",
              "zod",
            ],
          },

          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },

    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "i18next",
        "react-i18next",
        "recharts",
        "lodash-es",
        "date-fns",
        "clsx",
        "zod",
      ],
      // Keep heavy editors out of pre-bundling
      exclude: ["@tiptap/react", "@tiptap/starter-kit"],
    },

    esbuild: {
      drop: isProd ? ["console", "debugger"] : [],
      minifyIdentifiers: isProd,
      minifySyntax: isProd,
      minifyWhitespace: isProd,
    },
  };
});

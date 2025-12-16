import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "127.0.0.1",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Ensure we use the ESM build of lodash to avoid missing default exports
      // when dependencies (like recharts) deep-import lodash utilities.
      lodash: "lodash-es",
    },
  },
  build: {
    // Enable source maps only in development
    sourcemap: mode === "development",
    // Target modern browsers for smaller bundles
    target: "esnext",
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching and parallel loading
        manualChunks: {
          // Core React runtime - rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI framework - Radix primitives (split into two chunks for parallel loading)
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
          // Data fetching and state management
          "vendor-query": ["@tanstack/react-query", "@supabase/supabase-js"],
          // Animation library - loaded when needed (defer loading)
          "vendor-animation": ["framer-motion"],
          // Charts - only loaded on dashboard/analytics pages
          "vendor-charts": ["recharts"],
          // Rich text editor - only loaded on blog/content pages
          "vendor-editor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-link",
            "@tiptap/extension-image",
            "@tiptap/extension-placeholder",
          ],
          // i18n - loaded at startup but cached
          "vendor-i18n": ["i18next", "react-i18next", "i18next-browser-languagedetector"],
          // Utilities - split for better caching
          "vendor-utils": ["date-fns", "clsx", "tailwind-merge", "zod"],
        },
        // Optimize chunk file names for better caching
        chunkFileNames: (chunkInfo) => {
          // Use content hash for vendor chunks (long cache)
          if (chunkInfo.name?.startsWith("vendor-")) {
            return "assets/[name]-[hash].js";
          }
          // Use content hash for app chunks
          return "assets/[name]-[hash].js";
        },
      },
    },
    // Minification settings - use terser for better compression in production
    minify: mode === "production" ? "esbuild" : false,
    // CSS code splitting
    cssCodeSplit: true,
    // Reduce CSS size
    cssMinify: true,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "i18next",
      "react-i18next",
      // recharts and lodash need pre-bundling for ES module compatibility
      // lodash individual modules don't have default exports
      "recharts",
      "lodash-es",
      // Pre-bundle commonly used utilities
      "date-fns",
      "clsx",
      "zod",
    ],
    // Exclude heavy libraries from pre-bundling - let them be split
    exclude: ["@tiptap/react", "@tiptap/starter-kit"],
  },
  // Performance optimizations
  esbuild: {
    // Drop console and debugger in production
    drop: mode === "production" ? ["console", "debugger"] : [],
    // Minify identifiers for smaller bundles
    minifyIdentifiers: mode === "production",
    minifySyntax: mode === "production",
    minifyWhitespace: mode === "production",
  },
}));

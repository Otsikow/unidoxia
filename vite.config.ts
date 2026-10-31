import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

const configDir = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Refer & Earn money-figure switch (src/config/referral.ts). Build time only, default 'no-figure', so the
  // bundler drops the £ copy unless the build selects '£500'. npm run build refuses '£500' (prebuild guard).
  const referralEnv = loadEnv(mode, process.cwd(), "VITE_REFERRAL_");
  const referralHeadlineMode =
    (process.env.VITE_REFERRAL_HEADLINE_MODE ?? referralEnv.VITE_REFERRAL_HEADLINE_MODE) === "£500" ? "£500" : "no-figure";
  return {
    define: {
      __REFERRAL_HEADLINE_MODE__: JSON.stringify(referralHeadlineMode),
    },
    // Keep generated Vite cache files inside this checkout. The dependency
    // directory may be shared or read-only in managed development environments.
    cacheDir: ".vite-cache",
    server: {
      host: "127.0.0.1",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(configDir, "./src"),
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
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Minification settings for better compression
      minify: "esbuild",
      // Enable CSS minification
      cssMinify: true,
      // Report compressed size for better bundle analysis
      reportCompressedSize: false, // Disable for faster builds
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal caching and parallel loading
          manualChunks: {
            // Core React runtime - rarely changes
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            // UI framework - Radix primitives
            "vendor-radix": [
              "@radix-ui/react-accordion",
              "@radix-ui/react-alert-dialog",
              "@radix-ui/react-avatar",
              "@radix-ui/react-checkbox",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-label",
              "@radix-ui/react-popover",
              "@radix-ui/react-progress",
              "@radix-ui/react-scroll-area",
              "@radix-ui/react-select",
              "@radix-ui/react-separator",
              "@radix-ui/react-slot",
              "@radix-ui/react-switch",
              "@radix-ui/react-tabs",
              "@radix-ui/react-toast",
              "@radix-ui/react-toggle",
              "@radix-ui/react-tooltip",
            ],
            // Data fetching and state management
            "vendor-query": ["@tanstack/react-query", "@supabase/supabase-js"],
            // Animation library - loaded when needed
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
            // Utilities
            "vendor-utils": ["date-fns", "clsx", "tailwind-merge", "zod"],
          },
        },
      },
      // Preload directives for critical chunks
      modulePreload: {
        polyfill: true,
      },
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
      ],
      // Exclude heavy libraries from pre-bundling - let them be split
      exclude: ["@tiptap/react", "@tiptap/starter-kit"],
    },
  };
});

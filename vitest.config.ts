import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Bound UI-test concurrency so large staff/admin fixtures keep reliable timing.
    maxWorkers: 2,
    minWorkers: 1,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: './vitest.environment.ts',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});

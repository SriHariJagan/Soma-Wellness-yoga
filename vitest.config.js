import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', 'server/__tests__/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/frontend',
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/**/*.module.css',
        'src/**/*.css',
        'src/data/**',
        'src/locales/**',
      ],
      thresholds: {
        statements: 10,
        branches: 30,
        functions: 20,
        lines: 10,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

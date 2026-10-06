import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom as the browser-like environment for component tests
    environment: 'jsdom',
    // Automatically import vitest globals (describe, it, expect) — no import needed
    globals: true,
    // Run this setup file before each test file
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});

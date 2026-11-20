import { defineConfig } from 'vitest/config';

// Test configuration for the To-Do List Dashboard.
// The app uses classic (non-module) IIFE scripts that attach to `window`, so the
// jsdom environment is required to provide `window`, `document`, `localStorage`,
// `URL`, `crypto`, and timers. Tests load the implementation scripts via
// `new Function('window', code)(globalThis)` so the IIFEs bind to the jsdom
// global (globalThis === window in jsdom).
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

// Minimal demo dev server config (vanilla TS)
export default defineConfig({
  root: './test',
  resolve: {
    alias: {
      // Map source imports to the actual source files for development
      'tweakpane-compact-kit': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  // No production site build for demo; use dev server only
});

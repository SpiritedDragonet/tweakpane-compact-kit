import { defineConfig } from 'vite';
import { resolve } from 'path';

// Minimal demo dev server config (vanilla TS)
export default defineConfig({
  root: './demo',
  resolve: {
    alias: {
      // Map source imports to the actual source files for development
      'tweakpane-compact-kit': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,  // 强制使用 5173 端口，如果被占用则失败
    open: true,
  },
  // No production site build for demo; use dev server only
});

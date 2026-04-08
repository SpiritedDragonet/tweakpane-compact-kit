import { defineConfig } from 'vite';
import { resolve } from 'path';
import { createShowcaseWritePlugin } from './showcaseWritePlugin';

// Minimal demo dev server config (vanilla TS)
export default defineConfig({
  root: './demo',
  plugins: [createShowcaseWritePlugin(resolve(__dirname, '..'))],
  resolve: {
    alias: {
      // Map source imports to the actual source files for development
      'tweakpane-compact-kit': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,  // 强制使用 5173 端口，如果被占用则失败
    open: false,
  },
  // No production site build for demo; use dev server only
});

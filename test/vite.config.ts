import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Test/Demo dev server config
export default defineConfig({
  plugins: [react()],
  root: './test',
  // Remove alias to use default module resolution
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
});
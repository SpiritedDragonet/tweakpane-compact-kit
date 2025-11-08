import { defineConfig } from 'vite';
import { resolve } from 'path';

// Library build config for SplitLayoutPlugin
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugins/index.ts'),
      name: 'TweakpaneSplitLayout',
      fileName: (format) => `tweakpane-split-layout.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['tweakpane'],
      output: {
        globals: {
          tweakpane: 'Tweakpane',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
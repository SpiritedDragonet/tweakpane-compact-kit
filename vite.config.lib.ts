import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

// Library build config for SplitLayoutPlugin
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TweakpaneCompactKit',
      fileName: (format) => `tweakpane-compact-kit.${format}.js`,
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: ['tweakpane', '@tweakpane/plugin-essentials'],
      output: {
        globals: {
          tweakpane: 'Tweakpane',
          '@tweakpane/plugin-essentials': 'TweakpaneEssentials',
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      exclude: ['test/**'],
    }),
  ],
});
import { defineConfig } from 'vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { createShowcaseWritePlugin } from '../showcaseWritePlugin';

const configDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(configDir, '..', '..');

export default defineConfig({
  root: configDir,
  plugins: [createShowcaseWritePlugin(repoRoot)],
  server: {
    port: 5174,
    strictPort: true,
    open: false,
    fs: {
      allow: [repoRoot],
    },
  },
});

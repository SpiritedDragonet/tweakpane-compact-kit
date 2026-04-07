import { defineConfig } from 'vite';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { README_SCREENSHOT_FILES } from '../src/demo/showcaseSections';

const showcaseImageDir = resolve(__dirname, '../docs/images');
const allowedScreenshotFiles = new Set(README_SCREENSHOT_FILES);

function showcaseWritePlugin() {
  return {
    name: 'showcase-write-plugin',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/__write-showcase-svgs') {
          next();
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += String(chunk);
        });

        req.on('end', async () => {
          try {
            const payload = JSON.parse(body) as Array<{fileName?: unknown; svgText?: unknown}>;
            if (!Array.isArray(payload)) {
              throw new Error('Expected an array payload.');
            }

            for (const entry of payload) {
              if (typeof entry?.fileName !== 'string' || typeof entry?.svgText !== 'string') {
                throw new Error('Invalid export payload.');
              }
              if (!allowedScreenshotFiles.has(entry.fileName)) {
                throw new Error(`Unknown screenshot target: ${entry.fileName}`);
              }

              const targetPath = resolve(showcaseImageDir, entry.fileName);
              if (!targetPath.startsWith(showcaseImageDir)) {
                throw new Error('Invalid screenshot path.');
              }
              await writeFile(targetPath, entry.svgText, 'utf8');
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ count: payload.length }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(error instanceof Error ? error.message : 'Screenshot export failed.');
          }
        });
      });
    },
  };
}

// Minimal demo dev server config (vanilla TS)
export default defineConfig({
  root: './demo',
  plugins: [showcaseWritePlugin()],
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

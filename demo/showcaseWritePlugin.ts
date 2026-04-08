import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { Plugin, ViteDevServer } from 'vite';

import { README_SCREENSHOT_FILES } from '../src/demo/showcaseSections';

const allowedScreenshotFiles = new Set(README_SCREENSHOT_FILES);

export function createShowcaseWritePlugin(repoRoot: string): Plugin {
  const showcaseImageDir = resolve(repoRoot, 'docs/images');

  return {
    name: 'showcase-write-plugin',
    configureServer(server: ViteDevServer) {
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

import { CompactKitBundle } from 'tweakpane-compact-kit';

import { mountShowcaseDemoWithBundle } from '../../src/demo/showcaseMount';

const root = document.getElementById('showcase-root');

if (!root) {
  throw new Error('Missing #showcase-root demo container.');
}

const captureMode = new URL(window.location.href).searchParams.get('capture') === '1';

const mounted = mountShowcaseDemoWithBundle(CompactKitBundle, document, root, {
  captureMode,
  writeCapturedSvgs: async (exports) => {
    const response = await fetch('/__write-showcase-svgs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        exports.map((entry) => ({
          fileName: entry.fileName,
          svgText: entry.svgText,
        })),
      ),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json() as Promise<{count?: number}>;
  },
});

window.addEventListener('beforeunload', () => {
  mounted.destroy();
}, { once: true });

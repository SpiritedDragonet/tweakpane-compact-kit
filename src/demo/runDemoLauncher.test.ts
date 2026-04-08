import { describe, expect, it } from 'vitest';

import { createDemoSteps } from '../../scripts/run-demo.mjs';

describe('demo launcher', () => {
  it('builds the library before starting the demo server', () => {
    expect(createDemoSteps()).toEqual([
      {
        label: 'build:lib',
        args: ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.config.lib.ts'],
      },
      {
        label: 'demo',
        args: ['node_modules/vite/bin/vite.js', '--config', 'demo/vite.config.ts', '--host'],
      },
    ]);
  });

  it('adds the capture query only when capture mode is enabled', () => {
    expect(createDemoSteps({ capture: true })[1]).toEqual({
      label: 'demo',
      args: ['node_modules/vite/bin/vite.js', '--config', 'demo/vite.config.ts', '--host', '--open', '/?capture=1'],
    });
  });
});

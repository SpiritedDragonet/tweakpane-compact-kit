import { describe, expect, it } from 'vitest';

import { npmCommand } from '../../scripts/run-demo.mjs';
import {
  createPublishedDemoSteps,
  resolvePublishedPackageSpec,
} from '../../scripts/run-published-demo.mjs';

describe('published demo launcher', () => {
  it('installs the published package before starting the consumer demo server', () => {
    expect(createPublishedDemoSteps()).toEqual([
      {
        label: 'install:published-demo-deps',
        command: npmCommand,
        args: ['install'],
        cwd: 'demo/published',
      },
      {
        label: 'install:published-package',
        command: npmCommand,
        args: ['install', 'tweakpane-compact-kit@latest', '--no-save'],
        cwd: 'demo/published',
      },
      {
        label: 'demo:published',
        args: ['node_modules/vite/bin/vite.js', '--config', 'demo/published/vite.config.ts', '--host'],
      },
    ]);
  });

  it('lets callers override the published package spec explicitly', () => {
    expect(resolvePublishedPackageSpec({ PUBLISHED_PACKAGE_SPEC: 'tweakpane-compact-kit@0.1.1' })).toBe(
      'tweakpane-compact-kit@0.1.1',
    );
    expect(
      createPublishedDemoSteps({
        packageSpec: 'tweakpane-compact-kit@0.1.1',
        npmCommand: 'npm.cmd',
      })[1],
    ).toEqual({
      label: 'install:published-package',
      command: 'npm.cmd',
      args: ['install', 'tweakpane-compact-kit@0.1.1', '--no-save'],
      cwd: 'demo/published',
    });
  });

  it('adds the capture query only when capture mode is enabled', () => {
    expect(createPublishedDemoSteps({ capture: true })[2]).toEqual({
      label: 'demo:published',
      args: [
        'node_modules/vite/bin/vite.js',
        '--config',
        'demo/published/vite.config.ts',
        '--host',
        '--open',
        '/?capture=1',
      ],
    });
  });
});

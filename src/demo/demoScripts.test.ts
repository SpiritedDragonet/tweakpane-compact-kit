import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json';

describe('demo npm scripts', () => {
  it('routes demo entrypoints through the node launcher', () => {
    const scripts = packageJson.scripts ?? {};

    expect(scripts.dev).toBe('node scripts/run-demo.mjs');
    expect(scripts.demo).toBe('node scripts/run-demo.mjs');
    expect(scripts['demo:capture']).toBe('node scripts/run-demo.mjs --capture');
    expect(scripts['demo:published']).toBe('node scripts/run-published-demo.mjs');
  });
});

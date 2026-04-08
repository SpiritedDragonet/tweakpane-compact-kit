import { describe, expect, it } from 'vitest';

import {
  README_SCREENSHOT_FILES,
  SHOWCASE_SECTION_KEYS,
} from './showcaseSections';

describe('showcaseSections', () => {
  it('keeps the approved top-level section order', () => {
    expect(SHOWCASE_SECTION_KEYS).toEqual([
      'overview',
      'install',
      'quick-start',
      'first-split',
      'width-geometry',
      'custom-dom',
      'units-and-height-flow',
      'buttons',
      'compact-sliders-and-labels',
      'composing-layouts',
      'run-the-demo',
    ]);
  });

  it('keeps the approved screenshot inventory', () => {
    expect(README_SCREENSHOT_FILES).toEqual([
      'split-first-row.svg',
      'split-width-geometry.svg',
      'split-custom-dom.svg',
      'split-units-height-flow.svg',
      'buttons-overview.svg',
      'buttons-boolean-on.svg',
      'compact-sliders-compare.svg',
      'compact-sliders-split-leaf.svg',
      'composing-layouts.svg',
    ]);
  });
});

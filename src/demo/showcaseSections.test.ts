import { describe, expect, it } from 'vitest';

import {
  README_SCREENSHOT_FILES,
  SHOWCASE_SECTION_KEYS,
  SHOWCASE_SUBSECTIONS,
} from './showcaseSections';

describe('showcaseSections', () => {
  it('keeps the approved top-level section order', () => {
    expect(SHOWCASE_SECTION_KEYS).toEqual([
      'overview',
      'install',
      'quick-start',
      'first-split',
      'width-geometry',
      'units-and-height-flow',
      'control-semantics',
      'composing-layouts',
      'run-the-demo',
    ]);
  });

  it('keeps the approved screenshot inventory and dual-state pairs', () => {
    expect(README_SCREENSHOT_FILES).toEqual([
      'split-first-row.svg',
      'split-size-expressions.svg',
      'split-mixed-dom.svg',
      'button-boolean-off.svg',
      'button-boolean-on.svg',
      'button-sized-actions.svg',
      'compact-sliders-off.svg',
      'compact-sliders-on.svg',
      'composing-layouts.svg',
    ]);

    const paired = SHOWCASE_SUBSECTIONS.filter((entry) => entry.stateful);
    expect(paired.map((entry) => entry.key)).toEqual([
      'button-boolean',
      'compact-sliders',
    ]);
  });
});

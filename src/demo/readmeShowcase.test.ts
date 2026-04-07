import { describe, expect, it } from 'vitest';

import readme from '../../README.md?raw';
import { README_SCREENSHOT_FILES } from './showcaseSections';

describe('README showcase contract', () => {
  it('contains the approved section headings and image references', () => {
    expect(readme).toMatch(/^## Overview$/m);
    expect(readme).toMatch(/^## Install$/m);
    expect(readme).toMatch(/^## Quick Start$/m);
    expect(readme).toMatch(/^## 1 First Split$/m);
    expect(readme).toMatch(/^## 2 Width Geometry$/m);
    expect(readme).toMatch(/^## 3 Units And Height Flow$/m);
    expect(readme).toMatch(/^## 4 Control Semantics$/m);
    expect(readme).toMatch(/^## 5 Composing Layouts$/m);
    expect(readme).not.toMatch(/^## Button Views$/m);
    expect(readme).not.toMatch(/^## Compact Sliders$/m);
    expect(readme).not.toMatch(/^## API Quick Reference$/m);
    expect(readme).toContain('`px` and `%` claim width first');
    expect(readme).toContain('row nodes resolve to the tallest visible child');
    expect(readme).toContain('unknown content only falls back to safe measurement');
    expect(readme).toContain('`boolean-button` preserves boolean binding semantics');
    expect(readme).toContain('`compactSliders` changes layout treatment only');

    README_SCREENSHOT_FILES.forEach((file) => {
      expect(readme).toContain(`docs/images/${file}`);
    });
  });
});

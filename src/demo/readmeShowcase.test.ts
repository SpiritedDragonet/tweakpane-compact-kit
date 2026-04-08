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
    expect(readme).toMatch(/^## 3 Custom DOM$/m);
    expect(readme).toMatch(/^## 4 Units And Height Flow$/m);
    expect(readme).toMatch(/^## 5 Buttons$/m);
    expect(readme).toMatch(/^## 6 Compact Sliders And Labels$/m);
    expect(readme).toMatch(/^## 7 Composing Layouts$/m);
    expect(readme).not.toMatch(/^## API Quick Reference$/m);
    expect(readme).toContain('`px` and `%` claim width first');
    expect(readme).toContain('row nodes resolve to the tallest visible child');
    expect(readme).toContain('Declared Span DOM');
    expect(readme).toContain('Measured Fallback DOM');
    expect(readme).toContain('republish the declared host span directly');
    expect(readme).not.toContain('unknown DOM');
    expect(readme).toContain('Buttons share one content model');
    expect(readme).toContain('`compactSliders` changes layout treatment only');
    expect(readme).toContain("addRow('1fr 3fr 20%', ['1fr', '3fr', '20%'])");
    expect(readme).not.toContain("addRow('200px 1fr 30%', ['200px', '1fr', '30%'])");
    expect(readme).toContain('Native Vs Compact');
    expect(readme).toContain('Wrapped Labels');

    README_SCREENSHOT_FILES.forEach((file) => {
      expect(readme).toContain(`docs/images/${file}`);
    });
  });
});

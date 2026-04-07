import { describe, expect, it } from 'vitest';

import { mountShowcaseDemo } from './showcaseDemo';

describe('mountShowcaseDemo', () => {
  it('renders the compact live-demo sections in order', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const titles = Array.from(root.querySelectorAll('[data-showcase-title]')).map((el) =>
      el.textContent?.trim(),
    );

    expect(titles).toEqual([
      '1 First Split',
      '2 Width Geometry',
      '3 Units And Height Flow',
      '4 Control Semantics',
      '5 Composing Layouts',
    ]);

    const pageText = root.textContent ?? '';
    expect(pageText).toContain('One split root creates slots.');
    expect(pageText).toContain('All row widths follow one geometry model');
    expect(pageText).toContain('Width is split horizontally; height flows through units.');
    expect(pageText).toContain('Boolean buttons keep boolean logic');
    expect(pageText).not.toContain('Button Extensions');
  });

  it('keeps capture controls hidden by default and avoids visible duplicate state demos', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    expect(root.querySelector('[data-capture-button]')).toBeNull();
    expect(root.querySelectorAll('[data-demo-example="boolean-button"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-demo-example="compact-sliders"]')).toHaveLength(1);
  });

  it('shows capture controls in capture mode and keeps stable export targets', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    const mounted = mountShowcaseDemo(document, root, { captureMode: true });
    const exportKeys = Array.from(mounted.exportTargets.keys());

    expect(root.querySelector('[data-capture-button]')).not.toBeNull();

    expect(exportKeys).toEqual([
      'split-first-row',
      'split-size-expressions',
      'split-mixed-dom',
      'button-boolean-off',
      'button-boolean-on',
      'button-sized-actions',
      'compact-sliders-off',
      'compact-sliders-on',
      'composing-layouts',
    ]);
  });
});

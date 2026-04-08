import { describe, expect, it } from 'vitest';

import { mountShowcaseDemo } from './showcaseDemo';

function waitForMacrotask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getPx(styleValue: string) {
  const match = styleValue.match(/^([0-9]+(?:\.[0-9]+)?)px$/);
  return match ? Number.parseFloat(match[1]) : 0;
}

function estimateDemoCardHeight(card: HTMLElement) {
  const paddingTop = getPx(card.style.paddingTop || card.style.padding);
  const paddingBottom = getPx(card.style.paddingBottom || card.style.padding);
  const rowGap = getPx(card.style.gap);
  const children = Array.from(card.children) as HTMLElement[];

  const contentHeight = children.reduce((sum, child) => {
    const lines = Math.max(1, child.textContent?.split('\n').length ?? 1);
    const lineHeight = getPx(child.style.lineHeight);
    return sum + lineHeight * lines;
  }, 0);

  return paddingTop + paddingBottom + contentHeight + Math.max(0, children.length - 1) * rowGap;
}

describe('mountShowcaseDemo', () => {
  it('renders the compact live-demo sections in order', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const titles = Array.from(root.querySelectorAll('[data-showcase-title]')).map((el) =>
      el.textContent?.trim(),
    );
    const subtitles = Array.from(root.querySelectorAll('.subtitle')).map((el) =>
      el.textContent?.trim(),
    );

    expect(titles).toEqual([
      '1 First Split',
      '2 Width Geometry',
      '3 Custom DOM',
      '4 Units And Height Flow',
      '5 Buttons',
      '6 Compact Sliders And Labels',
      '7 Composing Layouts',
    ]);
    expect(subtitles).toEqual([
      'One split root creates slots for panes or plain DOM.',
      'One width model handles equal, fr, %, and mixed rows.',
      'Declare DOM spans when known; measure only as fallback.',
      'Rows use the tallest child. Columns sum visible units.',
      'Buttons share content; boolean and action semantics stay separate.',
      'Native and compact sliders differ only in layout treatment.',
      'Nested rows, columns, DOM, and controls keep one contract.',
    ]);
    expect(Math.max(...subtitles.map((text) => text?.length ?? 0))).toBeLessThanOrEqual(72);

    const pageText = root.textContent ?? '';
    expect(pageText).toContain('1fr');
    expect(pageText).toContain('3fr');
    expect(pageText).toContain('20%');
    expect(pageText).not.toContain('200px');
    expect(pageText).toContain('Native');
    expect(pageText).toContain('Compact');
    expect(pageText).toContain('Wrapped Labels');
    expect(pageText).toContain('3u Multiline');
    expect(pageText).toContain('Resizable Icon');
    expect(pageText).not.toContain('Split-Leaf Compact Labels');
  });

  it('keeps the custom-dom contrast and compact/native examples intentional', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);
    await waitForMacrotask();

    const measuredDom = Array.from(root.querySelectorAll('.tp-demo-domleaf')).find((el) =>
      el.textContent?.includes('Measured Fallback DOM'),
    ) as HTMLElement | undefined;
    expect(measuredDom).toBeDefined();
    expect(measuredDom?.style.minHeight).toBe('94px');
    expect(measuredDom?.textContent).toContain('Measured from content.');
    expect(measuredDom?.textContent).toContain('Rounds up.');
    expect(measuredDom?.textContent).not.toContain('No units are declared here.');

    const compactSection = Array.from(root.querySelectorAll('.demo-section')).find((section) =>
      section.textContent?.includes('6 Compact Sliders And Labels'),
    ) as HTMLElement | undefined;
    expect(compactSection).toBeDefined();

    const labels = Array.from(compactSection?.querySelectorAll('.tp-lblv_l') ?? []) as HTMLElement[];
    expect(labels.some((label) => label.style.position === '')).toBe(true);
    expect(labels.some((label) => label.style.position === 'absolute')).toBe(true);

    const unlabeledRows = compactSection?.querySelectorAll('.tp-lblv.tp-lblv-nol') ?? [];
    expect(unlabeledRows.length).toBeGreaterThan(0);
  });

  it('renders Units And Height Flow with a Details-driven declared-units gauge host', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    expect(root.textContent ?? '').toContain('Units');

    const placeholder = Array.from(root.querySelectorAll('.tp-demo-domleaf')).find((el) =>
      el.dataset.splitBaseUnits === '4' &&
      el.dataset.splitLiveUnits === '4' &&
      el.dataset.splitUnitBehavior === 'fixed' &&
      el.querySelector('[data-gauge-label="true"]') !== null,
    ) as HTMLElement | undefined;

    expect(placeholder).toBeDefined();
    expect(placeholder?.dataset.splitBaseUnits).toBe('4');
    expect(placeholder?.dataset.splitLiveUnits).toBe('4');
    expect(placeholder?.dataset.splitUnitBehavior).toBe('fixed');
    expect(placeholder?.textContent ?? '').not.toContain('Fixed 4u Visual');
    expect(placeholder?.textContent ?? '').not.toContain('Payload reacts inside.');
    expect(placeholder?.querySelector('[data-gauge-label="true"]')).not.toBeNull();

    const estimatedHeight = estimateDemoCardHeight(placeholder as HTMLElement);
    expect(estimatedHeight).toBeLessThanOrEqual(84);
  });

  it('uses color pickers in Units And Height Flow details and in Composing Layouts where accent editing is shown', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const unitsSection = Array.from(root.querySelectorAll('.demo-section')).find((section) =>
      section.textContent?.includes('4 Units And Height Flow'),
    ) as HTMLElement | undefined;
    expect(unitsSection).toBeDefined();

    const composingSection = Array.from(root.querySelectorAll('.demo-section')).find((section) =>
      section.textContent?.includes('7 Composing Layouts'),
    ) as HTMLElement | undefined;
    expect(composingSection).toBeDefined();

    const unitsColorViews = unitsSection?.querySelectorAll('.tp-colv, .tp-coltxtv, .tp-colswv') ?? [];
    expect(unitsColorViews.length).toBeGreaterThan(0);
    const unlabeledUnitsColorRow = unitsSection?.querySelector(
      '.tp-lblv.tp-lblv-nol .tp-colv, .tp-lblv.tp-lblv-nol .tp-coltxtv, .tp-lblv.tp-lblv-nol .tp-colswv',
    );
    expect(unlabeledUnitsColorRow).not.toBeNull();
    expect(unitsSection?.textContent ?? '').not.toContain('Level');
    expect(unitsSection?.textContent ?? '').not.toContain('Color');

    const composingColorViews = composingSection?.querySelectorAll('.tp-colv, .tp-coltxtv, .tp-colswv') ?? [];
    expect(composingColorViews.length).toBeGreaterThan(0);
    const unlabeledComposingColorRow = composingSection?.querySelector(
      '.tp-lblv.tp-lblv-nol .tp-colv, .tp-lblv.tp-lblv-nol .tp-coltxtv, .tp-lblv.tp-lblv-nol .tp-colswv',
    );
    expect(unlabeledComposingColorRow).not.toBeNull();
    expect(composingSection?.textContent ?? '').not.toContain('Cyan');
    expect(composingSection?.textContent ?? '').not.toContain('Amber');
    expect(composingSection?.textContent ?? '').not.toContain('Rose');
  });

  it('keeps all demo dom cards on the concise copy set', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const pageText = root.textContent ?? '';
    expect(pageText).toContain('Plain DOM');
    expect(pageText).toContain('Direct slot mount.');
    expect(pageText).toContain('Declared Span DOM');
    expect(pageText).toContain('Explicit 4u.');
    expect(pageText).toContain('Measured Fallback DOM');
    expect(pageText).toContain('Measured from content.');
    expect(pageText).toContain('Rounds up.');

    expect(pageText).not.toContain('Wrapped panes are optional.');
    expect(pageText).not.toContain('Plain DOM fits directly.');
    expect(pageText).not.toContain('Known up front.');
    expect(pageText).not.toContain('The layout trusts 4u directly.');
    expect(pageText).not.toContain('The host measures this block,');
    expect(pageText).not.toContain('then rounds upward.');
  });

  it('keeps the composing-layout demo native where intended and adds the on-state footer button', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const composingSection = Array.from(root.querySelectorAll('.demo-section')).find((section) =>
      section.textContent?.includes('7 Composing Layouts'),
    ) as HTMLElement | undefined;
    expect(composingSection).toBeDefined();

    const volumeLabel = Array.from(composingSection?.querySelectorAll('.tp-lblv_l') ?? []).find((el) =>
      el.textContent?.includes('Volume'),
    ) as HTMLElement | undefined;
    expect(volumeLabel).toBeDefined();
    expect(volumeLabel?.style.position).toBe('');

    const onButton = Array.from(composingSection?.querySelectorAll('.tp-boolean-button') ?? []).find((el) =>
      el.textContent?.trim() === 'On',
    ) as HTMLElement | undefined;
    expect(onButton).toBeDefined();
    expect(onButton?.dataset.buttonPressed).toBe('true');
  });

  it('keeps the icon-only buttons icon stable across toggle and shows a thematic boolean-on state', () => {
    document.body.innerHTML = '<div id="app"></div>';
    document.body.style.setProperty('--cnt-usz', '18px');
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    const buttonsSection = Array.from(root.querySelectorAll('.demo-section')).find((section) =>
      section.textContent?.includes('5 Buttons'),
    ) as HTMLElement | undefined;
    expect(buttonsSection).toBeDefined();

    const iconOnlyRoot = Array.from(buttonsSection?.querySelectorAll('.tp-boolean-button') ?? []).find((el) => {
      const text = (el.textContent ?? '').trim();
      return text === '';
    }) as HTMLElement | undefined;
    expect(iconOnlyRoot).toBeDefined();

    const iconOnlyButton = iconOnlyRoot?.querySelector('.tp-btnv_b') as HTMLButtonElement | null;
    const beforePath = iconOnlyRoot?.querySelector('svg path')?.getAttribute('d');
    expect(beforePath).toBe('M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0');
    iconOnlyButton?.click();
    const afterPath = iconOnlyRoot?.querySelector('svg path')?.getAttribute('d');
    expect(afterPath).toBe(beforePath);

    const onState = Array.from(buttonsSection?.querySelectorAll('.tp-boolean-button') ?? []).find((el) =>
      el.textContent?.includes('Signal') || el.textContent?.includes('Live'),
    ) as HTMLElement | undefined;
    expect(onState).toBeDefined();
    expect(onState?.dataset.buttonPressed).toBe('true');
    expect(onState?.textContent).toContain('Signal');
    expect(onState?.textContent).toContain('Live');
    expect(onState?.querySelector('svg path')?.getAttribute('d')).toBe('M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10');
  });

  it('keeps capture controls hidden by default', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    mountShowcaseDemo(document, root);

    expect(root.querySelector('[data-capture-button]')).toBeNull();
  });

  it('shows capture controls in capture mode and keeps stable export targets', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.getElementById('app') as HTMLElement;

    const mounted = mountShowcaseDemo(document, root, { captureMode: true });
    const exportKeys = Array.from(mounted.exportTargets.keys());

    expect(root.querySelector('[data-capture-button]')).not.toBeNull();

    expect(exportKeys).toEqual([
      'split-first-row',
      'split-width-geometry',
      'split-custom-dom',
      'split-units-height-flow',
      'buttons-overview',
      'buttons-boolean-on',
      'compact-sliders-compare',
      'compact-sliders-split-leaf',
      'composing-layouts',
    ]);
  });
});

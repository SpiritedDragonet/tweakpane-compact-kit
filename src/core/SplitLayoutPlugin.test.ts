import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';
import * as splitLayoutModule from './SplitLayoutPlugin';

function createSplitFixture(params: Record<string, unknown>) {
  document.body.innerHTML = '';
  document.body.style.setProperty('--cnt-usz', '18px');

  const host = document.createElement('div');
  document.body.appendChild(host);

  const pane = new Pane({ container: host });
  pane.registerPlugin(CompactKitBundle);

  const api = pane.addBlade({
    view: 'split-layout',
    ...params,
  }) as any;

  return { api, pane, host };
}

function waitForMacrotask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SplitLayoutPlugin height semantics', () => {
  it('uses native horizontal inset on row roots', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.paddingLeft).toBe('var(--cnt-hp)');
    expect(root.style.paddingRight).toBe('var(--cnt-hp)');
  });

  it('defaults gutter to 4px so inner gaps match the native inset scale', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.gap).toBe('4px');
  });

  it('derives column height from rowUnits when height is omitted', () => {
    const { api } = createSplitFixture({
      direction: 'column',
      rowUnits: '1 1 2',
      children: ['leaf', 'leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('80px');
  });

  it('uses fixed column height when rowUnits and height are both present', () => {
    const { api } = createSplitFixture({
      direction: 'column',
      rowUnits: '1 1 2',
      height: 240,
      children: ['leaf', 'leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    const panels = root.querySelectorAll('.tp-split-panel');

    expect(root.style.height).toBe('240px');
    expect((panels[0] as HTMLElement).style.flexGrow).toBe('1');
    expect((panels[2] as HTMLElement).style.flexGrow).toBe('2');
  });
});

describe('SplitLayoutPlugin slot API', () => {
  it('keeps the split module runtime surface minimal', () => {
    expect(Object.keys(splitLayoutModule).sort()).toEqual(['SplitLayoutPlugin']);
  });

  it('returns slots in depth-first document order and filters by category', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: [
        'alpha',
        {
          view: 'split-layout',
          direction: 'column',
          children: ['beta', 'gamma'],
        },
        'beta',
      ],
    });

    const slots = api.getSlots() as HTMLElement[];

    expect(slots.map((slot) => slot.dataset.splitPath)).toEqual(['0', '1.0', '1.1', '2']);
    expect(slots.map((slot) => slot.dataset.leafCategory)).toEqual(['alpha', 'beta', 'gamma', 'beta']);
    expect(api.getSlotsByCategory('beta')).toHaveLength(2);
    expect(api.getCategories()).toEqual(['alpha', 'beta', 'gamma']);
    expect(api.getSlotsByCategoryMap().get('beta')).toHaveLength(2);
  });

  it('cleans up interactive gutter handles on pane dispose', async () => {
    const { api, pane } = createSplitFixture({
      direction: 'row',
      interactive: true,
      children: ['alpha', 'beta', 'gamma'],
    });

    const root = api.controller.view.element as HTMLElement;

    await waitForMacrotask();
    expect(root.querySelectorAll('.tp-split-gutter')).toHaveLength(2);

    pane.dispose();
    expect(root.querySelectorAll('.tp-split-gutter')).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';
import * as splitLayoutModule from './SplitLayoutPlugin';
import { flushResizeObservers } from '../test/resizeObserver';

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

function waitForMicrotask() {
  return Promise.resolve();
}

function setStubHeight(el: HTMLElement, height: number) {
  el.getBoundingClientRect = (() => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: height,
    right: 0,
    width: 0,
    height,
    toJSON() {
      return {};
    },
  })) as typeof el.getBoundingClientRect;
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

  it('animates split height changes with a folder-like easing curve', () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['alpha', 'beta'],
    });

    const root = api.controller.view.element as HTMLElement;
    const panels = Array.from(root.querySelectorAll(':scope > .tp-split-panel')) as HTMLElement[];

    expect(root.style.transition).toContain('height 0.2s ease-in-out');
    expect(panels[0].style.transition).toContain('flex-basis 0.2s ease-in-out');
    expect(panels[0].style.transition).toContain('margin-top 0.2s ease-in-out');
  });

  it('defaults gutter to 4px so inner gaps match the native inset scale', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.gap).toBe('4px');
  });

  it('uses units as a baseline for empty column roots', () => {
    const { api } = createSplitFixture({
      direction: 'column',
      units: 3,
      children: ['leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('62px');
  });

  it('grows column roots to nested child demand', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      units: 3,
      children: [
        'alpha',
        {
          view: 'split-layout',
          direction: 'row',
          units: 4,
          children: ['beta', 'gamma'],
        },
      ],
    });

    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('84px');
  });

  it('treats mounted custom hosts as adaptive measured content', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['host'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const box = document.createElement('div');
    box.style.height = '62px';
    setStubHeight(box, 62);
    slot.appendChild(box);

    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    const panels = Array.from(root.querySelectorAll(':scope > .tp-split-panel')) as HTMLElement[];

    expect(root.style.height).toBe('62px');
    expect(panels[0].style.flexBasis).toBe('62px');
  });

  it('picks up same-turn custom host content before ResizeObserver flush', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['host'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const box = document.createElement('div');
    box.style.height = '84px';
    setStubHeight(box, 84);
    slot.appendChild(box);

    await waitForMicrotask();

    const root = api.controller.view.element as HTMLElement;
    const panels = Array.from(root.querySelectorAll(':scope > .tp-split-panel')) as HTMLElement[];

    expect(root.style.height).toBe('84px');
    expect(panels[0].style.flexBasis).toBe('84px');
  });

  it('shrinks back to the root baseline when custom host content becomes hidden', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      units: 1,
      children: ['host'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const box = document.createElement('div');
    box.style.height = '62px';
    setStubHeight(box, 62);
    slot.appendChild(box);

    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('62px');

    box.style.display = 'none';
    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    expect(root.style.height).toBe('18px');
  });

  it('prefers declared button units over inflated wrapper measurement for 2u boolean buttons', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['host'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    childPane.addBinding({ enabled: false }, 'enabled', {
      view: 'boolean-button',
      title: 'Enabled',
      units: 2,
    }) as any;

    const row = slot.querySelector('.tp-lblv') as HTMLElement | null;
    const button = slot.querySelector('.tp-btnv_b') as HTMLElement | null;
    const wrapper = slot.querySelector('.tp-rotv_c') as HTMLElement | null;
    const booleanButton = slot.querySelector('.tp-boolean-button') as HTMLElement | null;

    expect(row).not.toBeNull();
    expect(button).not.toBeNull();
    expect(wrapper).not.toBeNull();
    expect(booleanButton).not.toBeNull();
    expect((booleanButton as HTMLElement).dataset.splitLiveUnits).toBe('2');

    setStubHeight(row as HTMLElement, 62);
    setStubHeight(button as HTMLElement, 40);
    setStubHeight(wrapper as HTMLElement, 44);

    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('40px');
  });

  it('sums multiple controls mounted through a child pane instead of measuring only the first one', async () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['controls', 'preview'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const state = { value: 64, thickness: 10, rounded: true };
    childPane.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
    childPane.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
    childPane.addBinding(state, 'rounded', { label: 'Rounded' });

    const labels = Array.from(slot.querySelectorAll('.tp-lblv')) as HTMLElement[];
    expect(labels).toHaveLength(3);

    labels.forEach((label) => setStubHeight(label, 18));

    await waitForMacrotask();
    flushResizeObservers();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('62px');
  });

  it('treats native folders as 1u collapsed adaptive controls instead of measured 2u wrappers', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['folder', 'below'],
    });

    const [folderSlot, belowSlot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: folderSlot });

    const folderApi = (childPane as any).addFolder({ title: 'Details', expanded: false }) as any;
    folderApi.addButton({ title: 'Apply A' });
    folderApi.addButton({ title: 'Apply B' });

    const folderRoot = folderSlot.querySelector('.tp-fldv') as HTMLElement | null;
    expect(folderRoot).not.toBeNull();
    setStubHeight(folderRoot as HTMLElement, 22);

    const folderRows = Array.from(folderSlot.querySelectorAll('.tp-fldv_c .tp-lblv')) as HTMLElement[];
    expect(folderRows).toHaveLength(2);
    folderRows.forEach((row) => setStubHeight(row, 18));

    const belowBox = document.createElement('div');
    belowBox.style.height = '18px';
    setStubHeight(belowBox, 18);
    belowSlot.appendChild(belowBox);

    await waitForMicrotask();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    const panels = Array.from(root.querySelectorAll(':scope > .tp-split-panel')) as HTMLElement[];

    expect(panels[0].style.flexBasis).toBe('18px');
    expect(panels[1].style.flexBasis).toBe('18px');
    expect(root.style.height).toBe('40px');
  });

  it('recomputes column live units when a native folder expands and collapses', async () => {
    const { api } = createSplitFixture({
      direction: 'column',
      children: ['folder', 'below'],
    });

    const [folderSlot, belowSlot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: folderSlot });

    const folderApi = (childPane as any).addFolder({ title: 'Details', expanded: false }) as any;
    folderApi.addButton({ title: 'Apply A' });
    folderApi.addButton({ title: 'Apply B' });

    const folderRoot = folderSlot.querySelector('.tp-fldv') as HTMLElement | null;
    const folderContent = folderSlot.querySelector('.tp-fldv_c') as HTMLElement | null;
    expect(folderRoot).not.toBeNull();
    expect(folderContent).not.toBeNull();
    setStubHeight(folderRoot as HTMLElement, 22);

    const folderRows = Array.from(folderSlot.querySelectorAll('.tp-fldv_c .tp-lblv')) as HTMLElement[];
    expect(folderRows).toHaveLength(2);
    folderRows.forEach((row) => setStubHeight(row, 18));

    const belowBox = document.createElement('div');
    belowBox.style.height = '18px';
    setStubHeight(belowBox, 18);
    belowSlot.appendChild(belowBox);

    await waitForMicrotask();
    await waitForMacrotask();

    const root = api.controller.view.element as HTMLElement;
    const panels = Array.from(root.querySelectorAll(':scope > .tp-split-panel')) as HTMLElement[];

    expect(panels[0].style.flexBasis).toBe('18px');
    expect(root.style.height).toBe('40px');

    (folderRoot as HTMLElement).classList.add('tp-fldv-expanded');
    (folderContent as HTMLElement).style.display = 'block';

    await waitForMicrotask();
    await waitForMacrotask();

    expect(panels[0].style.flexBasis).toBe('62px');
    expect(root.style.height).toBe('84px');

    (folderRoot as HTMLElement).classList.remove('tp-fldv-expanded');

    await waitForMicrotask();
    await waitForMacrotask();

    expect(panels[0].style.flexBasis).toBe('18px');
    expect(root.style.height).toBe('40px');
  });

  it('picks up same-turn child pane controls before ResizeObserver flush', async () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['controls', 'preview'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const state = { value: 64, thickness: 10, rounded: true };
    childPane.addBinding(state, 'value', { min: 0, max: 100, label: 'Value' });
    childPane.addBinding(state, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
    childPane.addBinding(state, 'rounded', { label: 'Rounded' });

    const labels = Array.from(slot.querySelectorAll('.tp-lblv')) as HTMLElement[];
    expect(labels).toHaveLength(3);

    labels.forEach((label) => setStubHeight(label, 18));

    await waitForMicrotask();

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('62px');
  });
});

describe('SplitLayoutPlugin slot API', () => {
  it('keeps the split module runtime surface minimal', () => {
    expect(Object.keys(splitLayoutModule).sort()).toEqual(['SplitLayoutPlugin']);
  });

  it('keeps a single explicit child as a single row slot when sizes are omitted', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: ['leaf'],
    });

    expect(api.getSlots()).toHaveLength(1);
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

  it('does not add another horizontal inset to structural nested splits', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      children: [
        {
          view: 'split-layout',
          direction: 'column',
          children: ['alpha', 'beta'],
        },
        'gamma',
      ],
    });

    const root = api.controller.view.element as HTMLElement;
    const nestedRoot = root.querySelector('.tp-split-content > .tp-split-root') as HTMLElement | null;

    expect(root.style.paddingLeft).toBe('var(--cnt-hp)');
    expect(root.style.paddingRight).toBe('var(--cnt-hp)');
    expect(nestedRoot).not.toBeNull();
    expect((nestedRoot as HTMLElement).style.paddingLeft).toBe('0px');
    expect((nestedRoot as HTMLElement).style.paddingRight).toBe('0px');
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

  it('removes the extra label padding for button bindings inside split leaves', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      sizes: '1fr 1fr',
      children: ['leaf', 'leaf'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const state = { enabled: false };
    const buttonApi = childPane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      title: 'Enabled',
      units: 2,
    }) as any;

    const root = buttonApi.controller.view.element as HTMLElement;
    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });

  it('removes the extra label padding for hidden-label bindings inside split leaves', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      sizes: '1fr 1fr',
      children: ['leaf', 'leaf'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const state = { note: 'hello' };
    const inputApi = childPane.addBinding(state, 'note') as any;

    const root = inputApi.controller.view.element as HTMLElement;
    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });

  it('removes the extra label padding for button blades inside split leaves', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      sizes: '1fr 1fr',
      children: ['leaf', 'leaf'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const buttonApi = (childPane as any).addButton({ title: 'Action' });
    const root = (buttonApi.controller?.view?.element as HTMLElement | undefined)
      ?? (slot.querySelector('.tp-lblv.tp-lblv-nol') as HTMLElement | null);

    expect(root).not.toBeNull();
    expect((root as HTMLElement).style.paddingLeft).toBe('0px');
    expect((root as HTMLElement).style.paddingRight).toBe('0px');
  });

  it('does not add another horizontal inset to split blades mounted through wrapped panes', () => {
    const { api } = createSplitFixture({
      direction: 'row',
      sizes: '1fr 1fr',
      children: ['leaf', 'leaf'],
    });

    const [slot] = api.getSlots() as HTMLElement[];
    const childPane = new Pane({ container: slot });
    api.wrapPane(childPane);
    childPane.registerPlugin(CompactKitBundle);

    const nestedApi = childPane.addBlade({
      view: 'split-layout',
      direction: 'row',
      children: ['left', 'right'],
    }) as any;

    const nestedRoot = nestedApi.controller.view.element as HTMLElement;

    expect(nestedRoot.style.paddingLeft).toBe('0px');
    expect(nestedRoot.style.paddingRight).toBe('0px');
  });
});

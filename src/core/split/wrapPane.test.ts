import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../../index';
import { wrapSplitPane } from './wrapPane';

describe('wrapSplitPane', () => {
  it('removes extra label padding for hidden-label bindings', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const pane = new Pane({ container: host });
    pane.registerPlugin(CompactKitBundle);
    wrapSplitPane(pane);

    const api = pane.addBinding({ note: 'hello' }, 'note') as any;
    const root = api.controller.view.element as HTMLElement;

    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });

  it('removes horizontal inset from nested split blades added through the wrapped pane', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const pane = new Pane({ container: host });
    pane.registerPlugin(CompactKitBundle);
    wrapSplitPane(pane);

    const api = pane.addBlade({
      view: 'split-layout',
      direction: 'row',
      children: ['left', 'right'],
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });

  it('normalizes hidden-label bindings added through wrapped folders too', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const pane = new Pane({ container: host });
    pane.registerPlugin(CompactKitBundle);
    wrapSplitPane(pane);

    const folder = (pane as any).addFolder({ title: 'Details', expanded: true });
    const api = folder.addBinding({ accent: '#22d3ee' }, 'accent', { label: '' }) as any;
    const root = api.controller.view.element as HTMLElement;

    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });
});

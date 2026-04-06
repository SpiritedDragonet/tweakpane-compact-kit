import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';

describe('SizedButtonPlugin', () => {
  it('keeps title shorthand working after the shell refactor', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      title: 'Monitor\nGraph',
      units: 2,
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(button.textContent).toContain('Monitor');
    expect(button.style.height).toBe('40px');
  });

  it('renders icon + text content through the shared shell', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      units: 2,
      content: {
        text: 'Compact Sliders',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.querySelector('svg')).not.toBeNull();
    expect(root.textContent).toContain('Compact Sliders');
  });

  it('binds tweakpane positional classes onto the sized-button root', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      title: 'Run\nAction',
      units: 3,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.classList.contains('tp-v-fst')).toBe(true);
    expect(root.classList.contains('tp-v-vfst')).toBe(true);
    expect(root.classList.contains('tp-v-lst')).toBe(true);
    expect(root.classList.contains('tp-v-vlst')).toBe(true);
  });
});

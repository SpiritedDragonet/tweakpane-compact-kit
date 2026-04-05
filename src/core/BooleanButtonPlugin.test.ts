import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';

describe('BooleanButtonPlugin', () => {
  it('toggles a boolean binding when clicked', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { compact: false };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'compact', {
      view: 'boolean-button',
      title: 'Compact Sliders',
      units: 2,
    }) as any;

    (api.controller.buttonEl as HTMLButtonElement).click();
    expect(state.compact).toBe(true);
  });

  it('inherits missing on-state fields from base content', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: true };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      content: {
        text: 'Enabled',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
      contentOn: {
        text: 'Enabled On',
      },
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.textContent).toContain('Enabled On');
    expect(root.querySelector('svg')).not.toBeNull();
  });
});

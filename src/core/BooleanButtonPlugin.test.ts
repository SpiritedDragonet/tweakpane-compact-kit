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
    expect((api.controller.buttonEl as HTMLButtonElement).getAttribute('aria-pressed')).toBe('true');
  });

  it('publishes fixed split units on its root element', () => {
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

    const root = api.controller.view.element as HTMLElement;
    expect(root.dataset.splitBaseUnits).toBe('2');
    expect(root.dataset.splitLiveUnits).toBe('2');
    expect(root.dataset.splitUnitBehavior).toBe('fixed');
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

  it('publishes a pressed state and accent variable when enabled', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: true };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      title: 'Enabled',
      units: 2,
      onColor: '#0ea5e9',
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    const root = button.closest('.tp-boolean-button') as HTMLElement | null;

    expect(root).not.toBeNull();
    expect((root as HTMLElement).dataset.buttonPressed).toBe('true');
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.style.getPropertyValue('--tp-btn-accent')).toBe('#0ea5e9');
  });

  it('defaults the on-state accent to #22d3ee when no custom color is provided', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: true };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      title: 'Enabled',
      units: 2,
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(button.style.getPropertyValue('--tp-btn-accent')).toBe('#22d3ee');
  });
});

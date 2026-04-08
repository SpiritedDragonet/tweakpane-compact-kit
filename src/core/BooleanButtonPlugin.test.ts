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

  it('inherits the base text when the on-state only overrides the icon', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: true };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      content: {
        text: 'Signal Live',
        icon: {path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0', viewBox: '0 0 16 16'},
      },
      contentOn: {
        icon: {path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10', viewBox: '0 0 16 16'},
      },
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.textContent).toContain('Signal Live');
    expect(root.querySelector('svg path')?.getAttribute('d')).toBe('M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10');
  });

  it('inherits the entire base content when contentOn is omitted', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: true };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      content: {
        text: 'Power',
        icon: {path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0', viewBox: '0 0 16 16'},
      },
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(root.textContent).toContain('Power');
    expect(root.querySelector('svg path')?.getAttribute('d')).toBe('M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0');
    expect(button.style.getPropertyValue('--tp-btn-accent')).toBe('#22d3ee');
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

  it('applies iconSize through the shared button shell', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const state = { enabled: false };
    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBinding(state, 'enabled', {
      view: 'boolean-button',
      iconSize: 20,
      content: {
        text: 'System',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
      units: 2,
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(button.style.getPropertyValue('--tp-btnc-icon-size')).toBe('20px');
  });
});

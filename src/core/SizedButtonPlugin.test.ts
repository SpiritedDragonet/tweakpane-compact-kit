import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';
import { wrapSplitPane } from './split/wrapPane';

describe('SizedButtonPlugin', () => {
  it('uses a native no-label row wrapper so top-level buttons keep the default 4px inset contract', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      title: 'Monitor\nGraph',
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.classList.contains('tp-lblv')).toBe(true);
    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('');
    expect(root.style.paddingRight).toBe('');
    expect(root.querySelector('.tp-sized-button')).not.toBeNull();
  });

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

  it('publishes a shared icon-size variable for mixed content', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const pane = new Pane({container: document.body});
    pane.registerPlugin(CompactKitBundle);
    const api = pane.addBlade({
      view: 'sized-button',
      units: 3,
      iconSize: 24,
      content: {
        text: 'Resizable Icon',
        icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
      },
    }) as any;

    const button = api.controller.buttonEl as HTMLButtonElement;
    expect(button.style.getPropertyValue('--tp-btnc-icon-size')).toBe('24px');
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

  it('drops the native row inset when mounted through a wrapped split leaf', () => {
    document.body.innerHTML = '';
    document.body.style.setProperty('--cnt-usz', '18px');

    const host = document.createElement('div');
    document.body.appendChild(host);

    const pane = new Pane({container: host});
    pane.registerPlugin(CompactKitBundle);
    wrapSplitPane(pane);

    const api = pane.addBlade({
      view: 'sized-button',
      title: 'Monitor\nGraph',
      units: 2,
    }) as any;

    const root = api.controller.view.element as HTMLElement;
    expect(root.classList.contains('tp-lblv')).toBe(true);
    expect(root.classList.contains('tp-lblv-nol')).toBe(true);
    expect(root.style.paddingLeft).toBe('0px');
    expect(root.style.paddingRight).toBe('0px');
  });
});

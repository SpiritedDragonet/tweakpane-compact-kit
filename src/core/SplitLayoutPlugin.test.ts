import { describe, expect, it } from 'vitest';
import { Pane } from 'tweakpane';

import { CompactKitBundle } from '../index';

function createSplitApi(params: Record<string, unknown>) {
  document.body.innerHTML = '';
  document.body.style.setProperty('--cnt-usz', '18px');

  const host = document.createElement('div');
  document.body.appendChild(host);

  const pane = new Pane({ container: host });
  pane.registerPlugin(CompactKitBundle);

  return pane.addBlade({
    view: 'split-layout',
    ...params,
  }) as any;
}

describe('SplitLayoutPlugin height semantics', () => {
  it('derives column height from rowUnits when height is omitted', () => {
    const api = createSplitApi({
      direction: 'column',
      rowUnits: '1 1 2',
      children: ['leaf', 'leaf', 'leaf'],
    });

    const root = api.controller.view.element as HTMLElement;
    expect(root.style.height).toBe('84px');
  });

  it('uses fixed column height when rowUnits and height are both present', () => {
    const api = createSplitApi({
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

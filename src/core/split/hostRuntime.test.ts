import { beforeEach, describe, expect, it, vi } from 'vitest';

import { flushResizeObservers } from '../../test/resizeObserver';
import { createHostRuntime } from './hostRuntime';

type HostRuntimeState = {
  getBaseUnits: () => number;
  getLiveUnits: () => number;
  setBaseUnits: (nextUnits: number) => void;
  refresh: () => void;
};

async function waitForObserverRefresh() {
  await Promise.resolve();
  await Promise.resolve();
}

function toUnits(value: number): number {
  return Math.max(0, Math.floor(value));
}

function isElementHidden(el: HTMLElement): boolean {
  return el.style.display === 'none' || el.hidden;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('hostRuntime', () => {
  it('exports createHostRuntime', () => {
    expect(typeof createHostRuntime).toBe('function');
  });

  it('uses base units as a floor and returns 0 for hidden hosts', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    let liveUnits = 1;
    const refreshLayout = vi.fn();
    const state = createHostRuntime({
      container,
      resolveLiveUnits: () => liveUnits,
      refreshLayout,
      isDisposed: () => false,
      isElementHidden,
      toUnits,
      disposers: [],
    });

    state.setBaseUnits(3.8);
    expect(state.getBaseUnits()).toBe(3);
    expect(refreshLayout).toHaveBeenCalledTimes(1);

    state.refresh();
    expect(state.getLiveUnits()).toBe(3);

    liveUnits = 5;
    state.refresh();
    expect(state.getLiveUnits()).toBe(5);

    container.style.display = 'none';
    expect(state.getLiveUnits()).toBe(0);
  });

  it('coalesces same-turn resize observer refreshes into one layout pass', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const refreshLayout = vi.fn();
    const state = createHostRuntime({
      container,
      resolveLiveUnits: () => 2,
      refreshLayout,
      isDisposed: () => false,
      isElementHidden,
      toUnits,
      disposers: [],
    });

    flushResizeObservers();
    flushResizeObservers();
    await waitForObserverRefresh();

    expect(refreshLayout).toHaveBeenCalledTimes(1);
    expect(state.getLiveUnits()).toBe(2);
  });

  it('refreshes after host mutations and updates live units from current content', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const refreshLayout = vi.fn();
    const state = createHostRuntime({
      container,
      resolveLiveUnits: () => container.children.length,
      refreshLayout,
      isDisposed: () => false,
      isElementHidden,
      toUnits,
      disposers: [],
    });

    container.appendChild(document.createElement('div'));
    await waitForObserverRefresh();

    expect(refreshLayout).toHaveBeenCalledTimes(1);
    expect(state.getLiveUnits()).toBe(1);
  });
});

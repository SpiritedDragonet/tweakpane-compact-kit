import { describe, expect, it } from 'vitest';

import { readDeclaredUnitState, setSplitDomUnits } from './domUnitState';

describe('domUnitState', () => {
  it('publishes a fixed unit contract and syncs the host height', () => {
    const el = document.createElement('div');

    setSplitDomUnits(el, 4);

    expect(readDeclaredUnitState(el)).toEqual({
      baseUnits: 4,
      liveUnits: 4,
      behavior: 'fixed',
    });
    expect(el.style.height).toBe('calc(var(--cnt-usz) * 4 + 12px)');
  });

  it('can publish an adaptive live span and sync the host height to it', () => {
    const el = document.createElement('div');

    setSplitDomUnits(el, 2, {
      behavior: 'adaptive',
      liveUnits: 5,
    });

    expect(readDeclaredUnitState(el)).toEqual({
      baseUnits: 2,
      liveUnits: 5,
      behavior: 'adaptive',
    });
    expect(el.style.height).toBe('calc(var(--cnt-usz) * 5 + 16px)');
  });
});

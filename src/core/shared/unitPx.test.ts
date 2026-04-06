import { describe, expect, it } from 'vitest';

import { findUnitMeasurementAnchor, resolveUnitPx } from './unitPx';

describe('unitPx helpers', () => {
  it('prefers the nearest tweakpane container as the unit anchor', () => {
    document.body.innerHTML = '';

    const root = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.className = 'tp-rotv';
    wrapper.style.setProperty('--cnt-usz', '18px');
    wrapper.appendChild(root);
    document.body.appendChild(wrapper);

    expect(findUnitMeasurementAnchor(root)).toBe(wrapper);
    expect(resolveUnitPx(root)).toBe(18);
  });

  it('supports an explicit anchor override with fallback', () => {
    document.body.innerHTML = '';

    const root = document.createElement('div');
    const anchor = document.createElement('div');
    anchor.style.setProperty('--cnt-usz', '22px');
    document.body.append(anchor, root);

    expect(resolveUnitPx(root, { anchor, fallback: 1 })).toBe(22);
    expect(resolveUnitPx(root, { fallback: 7 })).toBe(7);
  });
});

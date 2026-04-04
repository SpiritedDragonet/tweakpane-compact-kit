import { describe, expect, it } from 'vitest';

import { measureCssUnit, readUnitPx } from './measure';

describe('readUnitPx', () => {
  it('reads --cnt-usz from computed style', () => {
    const el = document.createElement('div');
    el.style.setProperty('--cnt-usz', '18px');
    document.body.appendChild(el);

    expect(readUnitPx(el)).toBe(18);
  });

  it('falls back to probe measurement when css var is not directly readable', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    expect(measureCssUnit(el, '--cnt-usz', 18)).toBeGreaterThan(0);
  });
});

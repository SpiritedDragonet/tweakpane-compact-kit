import { describe, expect, it } from 'vitest';

import { createDonutGaugeSvg } from './donutGaugeSvg';

describe('donutGaugeSvg', () => {
  it('places the percentage label at the geometric center of the ring', () => {
    const svg = createDonutGaugeSvg(document, {
      width: 120,
      height: 80,
      value: 64,
    });

    const label = svg.querySelector('[data-gauge-label="true"]') as SVGTextElement | null;

    expect(label).not.toBeNull();
    expect(label?.getAttribute('x')).toBe('60');
    expect(label?.getAttribute('y')).toBe('40');
    expect(label?.getAttribute('text-anchor')).toBe('middle');
    expect(label?.getAttribute('dominant-baseline')).toBe('middle');
  });
});

import { describe, expect, it } from 'vitest';

import {
  computeColumnRootHeightPx,
  computeColumnUnitHeightPx,
  computeUnitsForMeasuredHeight,
} from './columnUnits';

describe('columnUnits', () => {
  it('treats a multi-unit panel as one span with internal gutters', () => {
    expect(computeColumnUnitHeightPx(2, 18, 4)).toBe(40);
    expect(computeColumnUnitHeightPx(3, 18, 4)).toBe(62);
  });

  it('derives the full column height from the same unit geometry', () => {
    expect(computeColumnRootHeightPx([1, 1, 2], 18, 4)).toBe(84);
  });

  it('maps measured content height back to the minimum required unit span', () => {
    expect(computeUnitsForMeasuredHeight(18, 18, 4)).toBe(1);
    expect(computeUnitsForMeasuredHeight(40, 18, 4)).toBe(2);
    expect(computeUnitsForMeasuredHeight(62, 18, 4)).toBe(3);
  });
});

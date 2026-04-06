import { describe, expect, it } from 'vitest';

import {
  computeMeasuredUnits,
  computeNodeLiveUnits,
  computeSpanHeightPx,
  type UnitNode,
} from './unitModel';

describe('computeNodeLiveUnits', () => {
  it('uses max for rows and sum for columns', () => {
    const row: UnitNode = {
      kind: 'row',
      baseUnits: 3,
      children: [
        { kind: 'fixed', baseUnits: 2, liveUnits: 2 },
        { kind: 'fixed', baseUnits: 5, liveUnits: 5 },
      ],
    };
    const column: UnitNode = {
      kind: 'column',
      baseUnits: 1,
      children: [
        { kind: 'fixed', baseUnits: 2, liveUnits: 2 },
        { kind: 'fixed', baseUnits: 3, liveUnits: 3 },
      ],
    };

    expect(computeNodeLiveUnits(row)).toBe(5);
    expect(computeNodeLiveUnits(column)).toBe(5);
  });

  it('treats empty and hidden nodes as zero current demand', () => {
    expect(computeNodeLiveUnits({ kind: 'empty', baseUnits: 0 })).toBe(0);
    expect(
      computeNodeLiveUnits({
        kind: 'adaptive',
        baseUnits: 2,
        hidden: true,
        liveUnits: 4,
      }),
    ).toBe(0);
  });
});

describe('computeMeasuredUnits', () => {
  it('defaults to safe upward quantization', () => {
    expect(computeMeasuredUnits(19, 18, 4, 'safe')).toBe(2);
    expect(computeMeasuredUnits(19, 18, 4, 'tight')).toBe(1);
  });

  it('returns zero current demand for empty or hidden measured content', () => {
    expect(computeMeasuredUnits(0, 18, 4, 'safe')).toBe(0);
    expect(computeMeasuredUnits(-1, 18, 4, 'tight')).toBe(0);
  });
});

describe('computeSpanHeightPx', () => {
  it('keeps multi-unit spans and internal gutters in one formula', () => {
    expect(computeSpanHeightPx(3, 18, 4)).toBe(62);
  });
});

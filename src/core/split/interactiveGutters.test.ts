import { describe, expect, it } from 'vitest';

import {
  computeDraggedColumnPairUnits,
  computeDraggedPairWidths,
} from './interactiveGutters';

describe('computeDraggedPairWidths', () => {
  it('preserves the visible total and the gutter invariant', () => {
    expect(
      computeDraggedPairWidths({
        leftVisiblePx: 194,
        rightVisiblePx: 800,
        deltaPx: 12,
        minVisiblePx: 40,
      }),
    ).toEqual({
      leftVisiblePx: 206,
      rightVisiblePx: 788,
    });
  });
});

describe('computeDraggedColumnPairUnits', () => {
  it('uses full track height when converting drag distance into unit steps', () => {
    expect(
      computeDraggedColumnPairUnits({
        leftUnits: 1,
        rightUnits: 2,
        deltaPx: 10,
        unitPx: 18,
        gutterPx: 4,
      }),
    ).toEqual({
      leftUnits: 1,
      rightUnits: 2,
    });

    expect(
      computeDraggedColumnPairUnits({
        leftUnits: 1,
        rightUnits: 2,
        deltaPx: 23,
        unitPx: 18,
        gutterPx: 4,
      }),
    ).toEqual({
      leftUnits: 2,
      rightUnits: 1,
    });
  });
});

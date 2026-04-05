import { describe, expect, it } from 'vitest';

import { computeDraggedPairWidths } from './interactiveGutters';

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

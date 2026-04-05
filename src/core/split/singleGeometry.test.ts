import { describe, expect, it } from 'vitest';

import { parseSizeExpression } from './sizeExpressions';
import { computeSplitGeometry } from './singleGeometry';

describe('computeSplitGeometry', () => {
  it('aligns 20/80 with 1fr 2fr 2fr at the first divider', () => {
    const a = computeSplitGeometry(parseSizeExpression([20, 80], 2), 1000, 6);
    const b = computeSplitGeometry(parseSizeExpression('1fr 2fr 2fr', 3), 1000, 6);

    expect(a.dividerStartsPx[0]).toBeCloseTo(b.dividerStartsPx[0], 6);
  });

  it('uses pre-cut px and percent spans for mixed syntax', () => {
    const g = computeSplitGeometry(parseSizeExpression('200px 1fr 30%', 3), 1000, 6);

    expect(g.preCutPx).toEqual([200, 506, 300]);
    expect(g.visiblePx).toEqual([194, 500, 294]);
  });
});

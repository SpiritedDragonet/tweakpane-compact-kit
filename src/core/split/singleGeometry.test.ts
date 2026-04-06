import { describe, expect, it } from 'vitest';

import { parseSizeExpression } from './sizeExpressions';
import { buildVisibleBasisCss, computeSplitGeometry } from './singleGeometry';

describe('computeSplitGeometry', () => {
  it('aligns 20/80 with 1fr 2fr 2fr at the first divider', () => {
    const a = computeSplitGeometry(parseSizeExpression([20, 80], 2), 1000, 6);
    const b = computeSplitGeometry(parseSizeExpression('1fr 2fr 2fr', 3), 1000, 6);

    expect(a.dividerStartsPx[0]).toBeCloseTo(b.dividerStartsPx[0], 6);
  });

  it('uses pre-cut px and percent spans for mixed syntax', () => {
    const g = computeSplitGeometry(parseSizeExpression('200px 1fr 30%', 3), 1000, 6);

    expect(g.preCutPx[0]).toBeCloseTo(200, 6);
    expect(g.preCutPx[1]).toBeCloseTo(504.2, 6);
    expect(g.preCutPx[2]).toBeCloseTo(301.8, 6);
    expect(g.visiblePx[0]).toBeCloseTo(194, 6);
    expect(g.visiblePx[1]).toBeCloseTo(498.2, 6);
    expect(g.visiblePx[2]).toBeCloseTo(295.8, 6);
  });

  it('treats percent tokens as pre-cut spans on the virtual width', () => {
    const percent = computeSplitGeometry(parseSizeExpression('20% 80%', 2), 1000, 4);
    const ratio = computeSplitGeometry(parseSizeExpression('1fr 2fr 2fr', 3), 1000, 4);

    expect(percent.dividerStartsPx[0]).toBeCloseTo(ratio.dividerStartsPx[0], 6);
    expect(percent.visiblePx.reduce((sum, value) => sum + value, 0) + 4).toBeCloseTo(1000, 6);
  });

  it('builds row basis css for percent tokens from the virtual width', () => {
    expect(buildVisibleBasisCss(parseSizeExpression('20% 80%', 2), 4)).toEqual([
      'calc(((100% + 4px) * 20 / 100) - 4px)',
      'calc(((100% + 4px) * 80 / 100) - 4px)',
    ]);
  });
});

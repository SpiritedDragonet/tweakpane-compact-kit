import { describe, expect, it } from 'vitest';

import { countSizeParts, parseSizeExpression, resolveSizeTokens } from './sizeExpressions';

describe('countSizeParts', () => {
  it('counts string segments for mixed inputs', () => {
    expect(countSizeParts('200px 1fr 30%')).toBe(3);
  });
});

describe('parseSizeExpression', () => {
  it('supports number arrays', () => {
    expect(resolveSizeTokens(parseSizeExpression([66, 34]), 100)).toEqual([66, 34]);
  });

  it('supports equal splits', () => {
    expect(resolveSizeTokens(parseSizeExpression('equal', 3), 900)).toEqual([300, 300, 300]);
  });

  it('supports pure fr strings', () => {
    expect(resolveSizeTokens(parseSizeExpression('1fr 2fr', 2), 900)).toEqual([300, 600]);
  });

  it('supports documented mixed strings with virtual-width percent spans', () => {
    const resolved = resolveSizeTokens(parseSizeExpression('200px 1fr 30%', 3), 1000, 6);

    expect(resolved[0]).toBeCloseTo(200, 6);
    expect(resolved[1]).toBeCloseTo(504.2, 6);
    expect(resolved[2]).toBeCloseTo(301.8, 6);
  });
});

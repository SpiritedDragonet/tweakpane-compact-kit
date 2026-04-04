import { describe, expect, it } from 'vitest';

import { normalizeSplitParams } from './params';
import { parseRowUnits } from './rowUnits';

describe('parseRowUnits', () => {
  it('parses bare unit strings', () => {
    expect(parseRowUnits('1 1 2')).toEqual([1, 1, 2]);
  });

  it('parses fr unit strings', () => {
    expect(parseRowUnits('2fr 1fr 1fr')).toEqual([2, 1, 1]);
  });

  it('rejects px and percent syntax', () => {
    expect(() => parseRowUnits('40px 1fr')).toThrow(/rowUnits/i);
    expect(() => parseRowUnits('50% 50%')).toThrow(/rowUnits/i);
  });
});

describe('normalizeSplitParams', () => {
  it('rejects undocumented gap alias', () => {
    expect(() =>
      normalizeSplitParams({ view: 'split-layout', direction: 'row', gap: 6 } as any),
    ).toThrow(/gutter/i);
  });
});

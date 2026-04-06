import { describe, expect, it } from 'vitest';

import { normalizeSplitParams } from './params';

describe('normalizeSplitParams', () => {
  it('rejects retired height and rowUnits fields', () => {
    expect(() =>
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'column',
        rowUnits: '1 1 2',
      } as any),
    ).toThrow(/rowUnits/i);

    expect(() =>
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'row',
        height: 240,
      } as any),
    ).toThrow(/height/i);
  });

  it('normalizes units as the only vertical baseline field', () => {
    expect(
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'column',
        units: 3,
        children: ['alpha'],
      } as any),
    ).toMatchObject({
      direction: 'column',
      units: 3,
      children: ['alpha'],
    });
  });

  it('rejects undocumented gap alias', () => {
    expect(() =>
      normalizeSplitParams({
        view: 'split-layout',
        direction: 'row',
        gap: 6,
      } as any),
    ).toThrow(/gutter/i);
  });
});

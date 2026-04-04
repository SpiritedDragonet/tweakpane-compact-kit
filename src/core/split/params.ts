import { countSizeParts, parseSizeExpression, type SizeToken } from './sizeExpressions';
import { parseRowUnits } from './rowUnits';
import type { SplitDirection, SplitLayoutNode, SplitLayoutParams } from '../SplitLayoutPlugin';

export type NormalizedSplitLayoutParams = {
  view: 'split-layout';
  direction: SplitDirection;
  sizes: SizeToken[];
  children: SplitLayoutNode[];
  rowUnits?: number[];
  height?: number | string;
  gutter: number;
  minSize: number;
  interactive: boolean;
  compactSliders: boolean;
};

function parseNumericSetting(value: number | string | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function normalizeSplitParams(input: SplitLayoutParams & Record<string, unknown>): NormalizedSplitLayoutParams {
  if ('gap' in input) {
    throw new Error('Use `gutter`; `gap` is not supported.');
  }

  const p = { ...input };
  const direction: SplitDirection = p.direction === 'column' ? 'column' : 'row';
  const children: SplitLayoutNode[] = Array.isArray(p.children) ? p.children.slice() : [];

  const sizeCount = countSizeParts(p.sizes, 2);
  const rowUnitCount = p.rowUnits ? countSizeParts(p.rowUnits, 0) : 0;
  let panelCount = Math.max(children.length || 0, sizeCount, rowUnitCount);
  if (panelCount <= 0) {
    panelCount = 2;
  }

  while (children.length < panelCount) {
    children.push('leaf');
  }

  return {
    view: 'split-layout',
    direction,
    sizes: parseSizeExpression(p.sizes, panelCount),
    children,
    rowUnits: p.rowUnits ? parseRowUnits(p.rowUnits, panelCount) : undefined,
    height: p.height,
    gutter: parseNumericSetting(p.gutter, 6),
    minSize: typeof p.minSize === 'number' ? p.minSize : 20,
    interactive: !!p.interactive,
    compactSliders: p.compactSliders !== false,
  };
}

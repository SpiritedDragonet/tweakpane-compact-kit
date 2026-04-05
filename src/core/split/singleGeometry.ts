import type { SizeToken } from './sizeExpressions';

type SplitGeometry = {
  virtualPx: number;
  preCutPx: number[];
  visiblePx: number[];
  dividerStartsPx: number[];
};

function formatPx(value: number): string {
  return `${value}px`;
}

function resolveFixedPreCutPx(token: SizeToken, containerPx: number): number {
  if (token.kind === 'px') {
    return token.value;
  }
  if (token.kind === 'percent') {
    return (token.value / 100) * containerPx;
  }
  return 0;
}

function getFlexibleWeight(tokens: SizeToken[]): number {
  return tokens.reduce((sum, token) => {
    if (token.kind === 'px' || token.kind === 'percent') {
      return sum;
    }
    return sum + token.value;
  }, 0);
}

function getReservedPreCutPx(tokens: SizeToken[], containerPx: number): number {
  return tokens.reduce((sum, token) => sum + resolveFixedPreCutPx(token, containerPx), 0);
}

function buildRemainingExpr(tokens: SizeToken[], gutterPx: number): string {
  const parts: string[] = [];

  parts.push('100%');
  if (gutterPx !== 0) {
    parts.push(formatPx(gutterPx));
  }

  for (const token of tokens) {
    if (token.kind === 'px') {
      parts.push(`- ${formatPx(token.value)}`);
      continue;
    }
    if (token.kind === 'percent') {
      parts.push(`- ${token.value}%`);
    }
  }

  return parts.join(' + ').replace(/\+\s-\s/g, '- ');
}

export function computeSplitGeometry(
  tokens: SizeToken[],
  containerPx: number,
  gutterPx: number,
): SplitGeometry {
  const safeContainerPx = Math.max(0, containerPx);
  const safeGutterPx = Math.max(0, gutterPx);
  const virtualPx = safeContainerPx + safeGutterPx;
  const reservedPreCutPx = getReservedPreCutPx(tokens, safeContainerPx);
  const flexibleWeight = getFlexibleWeight(tokens);
  const remainingPreCutPx = Math.max(0, virtualPx - reservedPreCutPx);

  const preCutPx = tokens.map((token) => {
    if (token.kind === 'px' || token.kind === 'percent') {
      return resolveFixedPreCutPx(token, safeContainerPx);
    }
    if (flexibleWeight <= 0) {
      return 0;
    }
    return (token.value / flexibleWeight) * remainingPreCutPx;
  });

  const visiblePx = preCutPx.map((span) => Math.max(0, span - safeGutterPx));
  const dividerStartsPx: number[] = [];
  let cursorPx = 0;

  for (let i = 0; i < visiblePx.length - 1; i += 1) {
    cursorPx += visiblePx[i];
    dividerStartsPx.push(cursorPx);
    cursorPx += safeGutterPx;
  }

  return {
    virtualPx,
    preCutPx,
    visiblePx,
    dividerStartsPx,
  };
}

export function buildVisibleBasisCss(tokens: SizeToken[], gutterPx: number): string[] {
  const safeGutterPx = Math.max(0, gutterPx);
  const flexibleWeight = getFlexibleWeight(tokens);
  const remainingExpr = buildRemainingExpr(tokens, safeGutterPx);

  return tokens.map((token) => {
    if (token.kind === 'px') {
      return `calc(${formatPx(token.value)} - ${formatPx(safeGutterPx)})`;
    }
    if (token.kind === 'percent') {
      return `calc(${token.value}% - ${formatPx(safeGutterPx)})`;
    }
    if (flexibleWeight <= 0) {
      return '0px';
    }
    return `calc(((${remainingExpr}) * ${token.value} / ${flexibleWeight}) - ${formatPx(safeGutterPx)})`;
  });
}

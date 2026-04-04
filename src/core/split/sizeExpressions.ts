export type SizeToken =
  | { kind: 'ratio'; value: number }
  | { kind: 'fr'; value: number }
  | { kind: 'px'; value: number }
  | { kind: 'percent'; value: number };

export type FlexSpec = {
  grow: number;
  shrink: number;
  basis: string;
};

function parsePositiveNumber(raw: string): number {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function countSizeParts(input: number[] | string | undefined, fallbackCount = 2): number {
  if (!input) return fallbackCount;
  if (Array.isArray(input)) return input.length || fallbackCount;
  if (input === 'equal') return fallbackCount;

  const parts = input.trim().split(/\s+/).filter(Boolean);
  return parts.length || fallbackCount;
}

export function parseSizeExpression(input: number[] | string | undefined, fallbackCount = 2): SizeToken[] {
  if (!input) {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
    }

    return input.map((value) => ({
      kind: 'ratio' as const,
      value: Number.isFinite(value) && value > 0 ? value : 1,
    }));
  }

  if (input === 'equal') {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return Array.from({ length: fallbackCount }, () => ({ kind: 'ratio', value: 1 as number }));
  }

  return parts.map((part) => {
    if (part.endsWith('fr')) {
      return { kind: 'fr' as const, value: parsePositiveNumber(part) || 1 };
    }
    if (part.endsWith('px')) {
      return { kind: 'px' as const, value: parsePositiveNumber(part) };
    }
    if (part.endsWith('%')) {
      return { kind: 'percent' as const, value: parsePositiveNumber(part) };
    }
    return { kind: 'ratio' as const, value: parsePositiveNumber(part) || 1 };
  });
}

export function resolveSizeTokens(tokens: SizeToken[], containerPx: number): number[] {
  const totalPx = Math.max(0, containerPx);

  let reservedPx = 0;
  let flexibleWeight = 0;

  for (const token of tokens) {
    if (token.kind === 'px') {
      reservedPx += token.value;
      continue;
    }
    if (token.kind === 'percent') {
      reservedPx += (token.value / 100) * totalPx;
      continue;
    }
    flexibleWeight += token.value;
  }

  const remainingPx = Math.max(0, totalPx - reservedPx);

  return tokens.map((token) => {
    if (token.kind === 'px') {
      return token.value;
    }
    if (token.kind === 'percent') {
      return (token.value / 100) * totalPx;
    }
    if (flexibleWeight <= 0) {
      return 0;
    }
    return (token.value / flexibleWeight) * remainingPx;
  });
}

export function toFlexSpec(token: SizeToken | undefined, fallbackWeight: number): FlexSpec {
  if (!token || token.kind === 'ratio' || token.kind === 'fr') {
    return {
      grow: Math.max(0.0001, token?.value ?? fallbackWeight),
      shrink: 0,
      basis: '0px',
    };
  }

  if (token.kind === 'px') {
    return {
      grow: 0,
      shrink: 0,
      basis: `${token.value}px`,
    };
  }

  return {
    grow: 0,
    shrink: 0,
    basis: `${token.value}%`,
  };
}

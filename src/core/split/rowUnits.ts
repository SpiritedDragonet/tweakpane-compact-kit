export function parseRowUnits(input: number[] | string | undefined, count = 0): number[] {
  if (!input) {
    return count > 0 ? Array.from({ length: count }, () => 1) : [];
  }

  if (Array.isArray(input)) {
    if (input.length === 0) {
      return count > 0 ? Array.from({ length: count }, () => 1) : [];
    }

    return input.map((value) => {
      const parsed = Number.isFinite(value) && value > 0 ? value : 1;
      return Math.max(1, Math.floor(parsed));
    });
  }

  if (input === 'equal') {
    const targetCount = count > 0 ? count : 1;
    return Array.from({ length: targetCount }, () => 1);
  }

  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return count > 0 ? Array.from({ length: count }, () => 1) : [];
  }

  return parts.map((part) => {
    if (part.endsWith('px') || part.endsWith('%')) {
      throw new Error('rowUnits only supports unit-like values, not px or %.');
    }

    const raw = part.endsWith('fr') ? part.slice(0, -2) : part;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`rowUnits contains an invalid unit segment: ${part}`);
    }

    return Math.max(1, Math.floor(parsed));
  });
}

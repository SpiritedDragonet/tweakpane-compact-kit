function parsePxValue(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return 0;

  const pxMatch = trimmed.match(/([0-9]+(?:\.[0-9]+)?)\s*px/i);
  if (pxMatch) {
    return Math.max(0, Number(pxMatch[1]));
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

export function readUnitPx(root: HTMLElement, fallback = 0): number {
  try {
    const win = root.ownerDocument?.defaultView ?? window;
    const raw = win.getComputedStyle(root).getPropertyValue('--cnt-usz');
    const px = parsePxValue(raw);
    if (px > 0) {
      return Math.max(1, Math.round(px));
    }
  } catch {}

  return fallback;
}

export function measureCssUnit(
  root: HTMLElement,
  cssVar: string,
  fallback = 0,
  anchor?: HTMLElement | null,
): number {
  const doc = root.ownerDocument;
  const probe = doc.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.height = `var(${cssVar})`;
  probe.style.width = '1px';

  const mountHost = anchor || root || doc.body;

  try {
    mountHost.appendChild(probe);
  } catch {
    try {
      root.appendChild(probe);
    } catch {
      try {
        doc.body.appendChild(probe);
      } catch {}
    }
  }

  const px = probe.getBoundingClientRect().height || probe.offsetHeight || 0;

  try {
    probe.remove();
  } catch {}

  if (px > 0) {
    return Math.max(1, Math.round(px));
  }

  return fallback;
}

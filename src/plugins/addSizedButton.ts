// A tiny helper to create an official Tweakpane button with an extra
// 'units' option (number of blade rows). It keeps official visuals by
// delegating to addButton, then adjusts container/button heights.
//
// This mirrors a v4-style convenience wrapper rather than a full Blade plugin,
// keeping integration simple and robust.

import type { Pane } from 'tweakpane';

export type SizedButtonOptions = {
  title?: string;
  units?: number; // number of blade rows, integer >= 1
  onClick?: () => void;
};

export function addSizedButton(host: Pane | any, opts: SizedButtonOptions = {}) {
  const units = Math.max(1, Math.floor(opts.units ?? 1));
  const btnApi: any = host.addButton({ title: opts.title ?? '' });
  if (opts.onClick) btnApi.on('click', opts.onClick);

  try {
    // Root of labeled view (controls vertical size)
    const rootEl: HTMLElement | undefined = btnApi?.controller?.labelController?.view?.element;
    if (rootEl) {
      // Let root grow naturally by content (button) height
      rootEl.style.height = 'auto';
      rootEl.style.minHeight = '0';
      rootEl.style.margin = '0';
      // Remove left label space (we don't use label for button)
      const labelBox = rootEl.querySelector('.tp-lblv_l') as HTMLElement | null;
      if (labelBox) labelBox.style.display = 'none';
      const valBox = rootEl.querySelector('.tp-lblv_v') as HTMLElement | null;
      if (valBox) (valBox.style as any).marginLeft = '0';
      // Compute 1 blade unit (px) reliably:
      // 1) Try reading computed CSS variable --cnt-usz (expected to be in px)
      // 2) Fallback to probing a hidden element
      // 3) Fallback to 28px (common TP default per theme)
      const computeUnitPx = () => {
        const doc = rootEl.ownerDocument;
        const findContainer = (el: HTMLElement | null): HTMLElement | null => {
          let cur: HTMLElement | null = el;
          while (cur) {
            if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) return cur;
            cur = cur.parentElement;
          }
          return el;
        };
        const cont = findContainer(rootEl) || rootEl;
        try {
          const cs = (cont && (cont.ownerDocument?.defaultView || window).getComputedStyle(cont)) as CSSStyleDeclaration;
          const v = cs.getPropertyValue('--cnt-usz')?.trim();
          if (v) {
            // Accept values like '28px' or numeric strings
            const m = v.match(/([0-9]+\.?[0-9]*)\s*px/i);
            if (m) return Math.max(1, Math.round(parseFloat(m[1])));
            const f = parseFloat(v);
            if (Number.isFinite(f) && f > 0) return Math.round(f);
          }
        } catch {}
        // Probe fallback
        try {
          const probe = doc.createElement('div');
          probe.style.position = 'absolute';
          probe.style.visibility = 'hidden';
          probe.style.height = 'var(--cnt-usz)';
          probe.style.width = '1px';
          (cont || rootEl).appendChild(probe);
          const px = probe.getBoundingClientRect().height || probe.offsetHeight || 0;
          probe.remove();
          if (px) return Math.max(1, Math.round(px));
        } catch {}
        return 0; // no fallback: rely on real computed/probed value only
      };
      const unitPx = computeUnitPx();

      // Button itself should fill the area
      const bEl = rootEl.querySelector('button') as HTMLElement | null;
      if (bEl) {
        // Make official button occupy N blade rows, with gap compensation
        // When units > 1, add (units - 1) * 4px to match the gap between separate blades
        const gutter = 4; // match the gutter in SplitLayoutPlugin
        if (unitPx > 0) {
          const totalHeight = units * unitPx + (units - 1) * gutter;
          bEl.style.height = `${totalHeight}px`;
        } else {
          // Fall back to CSS var-based calc with gap compensation
          const gapPx = (units - 1) * gutter;
          bEl.style.height = `calc(var(--cnt-usz) * ${units} + ${gapPx}px)`;
        }
        bEl.style.width = '100%';
        bEl.style.display = 'flex';
        bEl.style.alignItems = 'center';
        bEl.style.justifyContent = 'center';
        // Visual emphasis (within official button)
        bEl.style.fontWeight = '600';
        bEl.style.letterSpacing = '0.08em';
      }
    }
  } catch {
    // Ignore styling errors in case of internal API differences
  }

  return btnApi;
}

import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { SizedButtonPlugin } from '../../src/core/SplitLayoutPlugin';
import { randomInt, type LeafPlan } from './layoutPlan';

function removeLabelFor(bindingApi: any): void {
  // Remove the left label area entirely for non-slider/checkbox controls
  try {
    const elA: HTMLElement | undefined = (bindingApi?.controller?.view?.element);
    const elB: HTMLElement | undefined = (bindingApi?.controller?.labelController?.view?.element);
    const base = (elA || elB) as HTMLElement | undefined;
    if (!base) return;
    // Find the enclosing labeled view root
    const rootEl = (base.classList?.contains('tp-lblv') ? base : base.closest('.tp-lblv')) as HTMLElement | null;
    if (!rootEl) return;
    const labelBox = rootEl.querySelector('.tp-lblv_l') as HTMLElement | null;
    if (labelBox && labelBox.parentElement) {
      try { labelBox.parentElement.removeChild(labelBox); } catch {}
    }
    const valueBox = rootEl.querySelector('.tp-lblv_v') as HTMLElement | null;
    if (valueBox) {
      (valueBox.style as any).marginLeft = '0';
    }
  } catch {}
}

export function renderLeaf(pane: Pane, leaf: LeafPlan): void {
  if (leaf.kind === 'button') {
    pane.addButton({ title: 'Button' });
  } else if (leaf.kind === 'sizedbutton') {
    pane.addBlade({ view: 'sized-button', title: 'Multi-line', units: Math.max(2, leaf.sizedUnits ?? 2) });
  } else if (leaf.kind === 'number') {
    const o = { n: randomInt(-50, 50) };
    const api = pane.addBinding(o, 'n', { min: -100, max: 100, step: 1 });
    removeLabelFor(api);
  } else if (leaf.kind === 'slider') {
    const o = { v: Math.random() };
    pane.addBinding(o, 'v', { min: 0, max: 1, step: 0.01, label: 'VeryLongSliderLabelText' } as any);
  } else if (leaf.kind === 'range') {
    const o = { lo: randomInt(0, 40), hi: randomInt(60, 100) };
    const api1 = pane.addBinding(o, 'lo', { min: 0, max: 100, step: 1 });
    const api2 = pane.addBinding(o, 'hi', { min: 0, max: 100, step: 1 });
    removeLabelFor(api1);
    removeLabelFor(api2);
  } else if (leaf.kind === 'dropdown') {
    const items = [
      { text: 'Option A', value: 0 },
      { text: 'Option B', value: 1 },
      { text: 'Option C', value: 2 },
    ];
    const o = { choice: randomInt(0, 2) };
    pane.addBinding(o, 'choice', { options: items });
  } else if (leaf.kind === 'checkbox') {
    const o = { b: Math.random() < 0.5 };
    pane.addBinding(o, 'b', { label: 'Option' } as any);
  } else if (leaf.kind === 'color') {
    const o = { c: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') };
    const api = pane.addBinding(o, 'c');
    removeLabelFor(api);
  } else if (leaf.kind === 'point2d') {
    const o = { x: randomInt(-10, 10), y: randomInt(-10, 10) };
    const ax = pane.addBinding(o, 'x', { min: -100, max: 100, step: 1 });
    const ay = pane.addBinding(o, 'y', { min: -100, max: 100, step: 1 });
    removeLabelFor(ax);
    removeLabelFor(ay);
  } else if (leaf.kind === 'text') {
    const o = { s: `Text${randomInt(1, 99)}` };
    const api = pane.addBinding(o, 's');
    removeLabelFor(api);
  } else if (leaf.kind === 'buttongrid') {
    const cols = randomInt(2, 3);
    const rows = randomInt(1, 2);
    try {
      (pane as any).addBlade?.({
        view: 'buttongrid',
        size: [cols, rows],
        cells: (x: number, y: number) => ({ title: `B${y + 1}-${x + 1}` })
      });
    } catch {
      pane.addButton({ title: 'Button' });
    }
  } else if (leaf.kind === 'folder') {
    const f = pane.addFolder({ title: 'Group', expanded: true });
    const n = Math.max(2, leaf.folderChildren ?? 2);
    for (let i = 0; i < n; i++) {
      const o = { v: Math.random() };
      (f as any).addBinding?.(o, 'v', { min: 0, max: 1, step: 0.01 });
    }
  }
}

export function renderCustomDom(slot: HTMLElement, leaf: LeafPlan): void {
  if (leaf.kind !== 'customDom') return;
  const units = Math.max(1, leaf.customUnits ?? 1);
  const box = slot.ownerDocument.createElement('div');
  box.classList.add('tp-demo-domleaf');
  box.style.width = '100%';
  box.style.boxSizing = 'border-box';
  box.style.display = 'flex';
  box.style.alignItems = 'stretch';
  box.style.justifyContent = 'stretch';

  // Compute height the same way as sizedButton
  const computeUnitPx = () => {
    const doc = slot.ownerDocument;
    const findContainer = (el: HTMLElement | null): HTMLElement | null => {
      let cur: HTMLElement | null = el;
      while (cur) {
        if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) return cur;
        cur = cur.parentElement;
      }
      return el;
    };
    const cont = findContainer(slot) || slot;
    try {
      const cs = (cont && (cont.ownerDocument?.defaultView || window).getComputedStyle(cont)) as CSSStyleDeclaration;
      const v = cs.getPropertyValue('--cnt-usz')?.trim();
      if (v) {
        const m = v.match(/([0-9]+\.?[0-9]*)\s*px/i);
        if (m) return Math.max(1, Math.round(parseFloat(m[1])));
        const f = parseFloat(v);
        if (Number.isFinite(f) && f > 0) return Math.round(f);
      }
    } catch {}
    try {
      const probe = doc.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      probe.style.height = 'var(--cnt-usz)';
      probe.style.width = '1px';
      (cont || slot).appendChild(probe);
      const px = probe.getBoundingClientRect().height || probe.offsetHeight || 0;
      probe.remove();
      if (px) return Math.max(1, Math.round(px));
    } catch {}
    return 0;
  };
  const unitPx = computeUnitPx();

  // Apply height with gap compensation (same as sizedButton)
  const gutter = 4; // match the gutter in SplitLayoutPlugin
  if (unitPx > 0) {
    const totalHeight = units * unitPx + (units - 1) * gutter;
    box.style.height = `${totalHeight}px`;
  } else {
    const gapPx = (units - 1) * gutter;
    box.style.height = `calc(var(--cnt-usz) * ${units} + ${gapPx}px)`;
  }

  // Development only visual styling (no text content)
  box.style.border = '1px dashed #444';
  box.style.background = 'rgba(255,255,255,0.06)';

  // Add a data attribute for identification but no visible text
  box.setAttribute('data-dom-units', units.toString());

  slot.appendChild(box);
}
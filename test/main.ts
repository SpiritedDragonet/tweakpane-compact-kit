// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';
import * as Essentials from '@tweakpane/plugin-essentials';

// Utilities
function ensureRegistered(pane: Pane) {
  try { pane.registerPlugin(CompactKitBundle); } catch (e) {
    throw e;
  }
}

// Minimal type for the split-layout plugin API
type SplitApi = {
  getSlots(): HTMLElement[];
  getSlotsByCategory?: (category: string) => HTMLElement[];
  dispose?: () => void;
};

function unitPx(el: HTMLElement): number {
  try {
    const cs = getComputedStyle(el);
    const v = cs.getPropertyValue('--cnt-usz').trim();
    const m = v.match(/([0-9]+\.?[0-9]*)\s*px/i);
    if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  } catch {}
  return 18; // sensible default
}

function mountDomUnits(slot: HTMLElement, units: number, inner?: (box: HTMLElement) => void) {
  const box = document.createElement('div');
  box.className = 'tp-demo-domleaf';
  const u = unitPx(slot);
  const gutter = 4;
  box.style.height = `calc(${units} * var(--cnt-usz) + ${(units - 1) * gutter}px)`;
  box.style.display = 'grid';
  box.style.placeItems = 'center';
  // Use default/inherited colors; no hard-coded color
  box.style.fontSize = '12px';
  slot.appendChild(box);
  if (inner) inner(box);
  else box.textContent = `${units}u DOM (not a Tweakpane control)`;
}

function drawWave(container: HTMLElement, stroke = '#22d3ee', bg = '#0f172a') {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(100, container.clientWidth - 16);
  canvas.height = Math.max(50, container.clientHeight - 16);
  canvas.style.maxWidth = '100%';
  const pad = 8;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Dark background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Bright line
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x++) {
    const t = x / canvas.width * Math.PI * 4;
    const y = canvas.height / 2 + Math.sin(t) * (canvas.height / 3);
    if (x === 0) ctx.moveTo(pad, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function main() {
  const host = document.getElementById('host') as HTMLElement | null;
  if (!host) return;

  const pane = new Pane({ container: host, title: 'Compact Kit — Rows' });
  ensureRegistered(pane);
  try { pane.registerPlugin(Essentials); } catch {}

  // Row 1: Quick peek — Multiline button + a 3u placeholder (no direct DOM)
  const row1 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
    children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  const r1 = row1.getSlots();
  const r1l = new Pane({ container: r1[0] });
  ensureRegistered(r1l);
  r1l.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });
  const r1r = new Pane({ container: r1[1] });
  ensureRegistered(r1r);
  r1r.addBlade({ view: 'sized-button', title: 'Placeholder', units: 3 });

  // Row 2: 66 / 34
  const row2 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row2.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Button\n${i + 1}`, units: 2 });
  });

  // Row 3: equal — 3 columns
  const row3 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf', 'leaf']
  }) as unknown as SplitApi;
  row3.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Equal\n${i + 1}`, units: 2 });
  });

  // Row 4: 1fr 2fr
  const row4 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row4.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `1fr\n2fr`, units: 2 });
  });

  // Row 5: 40 10 (normalized)
  const row5 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row5.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Normalized`, units: 2 });
  });

  // Row 6: 3u placeholder (avoid custom DOM to prevent layout races)
  const row6 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr', children: ['leaf']
  }) as unknown as SplitApi;
  const r6 = row6.getSlots();
  const r6p = new Pane({ container: r6[0] });
  ensureRegistered(r6p);
  r6p.addBlade({ view: 'sized-button', title: 'Three\nUnits', units: 3 });

  // Section 2: Compact sliders toggle
  const host2 = document.getElementById('host-compact') as HTMLElement | null;
  if (host2) {
    const pane2 = new Pane({ container: host2, title: 'Compact vs Original' });
    ensureRegistered(pane2);
    try { pane2.registerPlugin(Essentials); } catch {}

    const state = { compact: true, a: 50 };
    let rowApi: SplitApi | null = null;
    let childPanes: Pane[] = [];

    const clearRow = () => {
      // Dispose child panes first (sliders, etc.)
      childPanes.forEach((p) => { try { p.dispose(); } catch {} });
      childPanes = [];
      // Remove the previous split-layout blade from pane
      if (rowApi) {
        try { (pane2 as unknown as { remove: (api: object) => void }).remove(rowApi as unknown as object); } catch {}
        rowApi = null;
      }
    };

    const render = () => {
      clearRow();
      const api = pane2.addBlade({
        view: 'split-layout',
        direction: 'row',
        sizes: '1fr 1fr',
        compactSliders: state.compact,
        preserveLabels: true,
        children: ['leaf', 'leaf']
      }) as unknown as SplitApi;
      rowApi = api;
      const [L, R] = api.getSlots();
      const pl = new Pane({ container: L }); ensureRegistered(pl);
      const pr = new Pane({ container: R }); ensureRegistered(pr);
      try { pl.registerPlugin(Essentials); } catch {}
      try { pr.registerPlugin(Essentials); } catch {}
      // Left: checkbox with label
      const leftCtl = pl.addBinding(state, 'compact', { label: 'Compact' });
      leftCtl.on('change', () => { requestAnimationFrame(render); });
      // Right: a single slider to demonstrate layout
      pr.addBinding(state, 'a', { min: 0, max: 100, label: 'Value' });
      childPanes.push(pl, pr);
    };

    render();
  }

  // Section 3: Custom categories (dense, equal occupancy per column)
  const host3 = document.getElementById('host-cats') as HTMLElement | null;
  if (host3) {
    const pane3 = new Pane({ container: host3, title: 'Semantic Leaves' });
    ensureRegistered(pane3);
    try { pane3.registerPlugin(Essentials); } catch {}

    // Row C1: 66 / 34 — no nested columns (avoid rowUnits), fill with controls
    const c1 = pane3.addBlade({ view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['alpha', 'beta'] }) as unknown as SplitApi;

    // Row C2: equal — three columns, fill each with two controls
    const c2 = pane3.addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['alpha', 'beta', 'gamma'] }) as unknown as SplitApi;

    // Row C3: 1fr 2fr — fill each side with three controls
    const c3 = pane3.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['alpha', 'gamma'] }) as unknown as SplitApi;

    // Fill on the next frame to avoid any initial measurement race
    requestAnimationFrame(() => {
      // C1 fill
      {
        const [l, r] = c1.getSlots();
        if (l) { const p = new Pane({ container: l }); ensureRegistered(p); p.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 }); }
        if (r) {
          const p = new Pane({ container: r }); ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ v: 42 }, 'v', { min: 0, max: 100 });
          p.addBinding({ on: true }, 'on');
          p.addBinding({ mode: 'a' }, 'mode', { options: { Alpha: 'a', Beta: 'b', Gamma: 'g' } });
        }
      }

      // C2 fill (two controls per column, no labels to keep compact)
      {
        const [a, b, g] = c2.getSlots();
        if (a) { const p = new Pane({ container: a }); ensureRegistered(p); p.addButton({ title: 'Action' }); p.addBinding({ text: 'hello' }, 'text'); }
        if (b) { const p = new Pane({ container: b }); ensureRegistered(p); p.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 }); p.addBinding({ c: '#22d3ee' }, 'c'); }
        if (g) { const p = new Pane({ container: g }); ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {} p.addBlade({ view: 'buttongrid', size: [2, 2], cells: (x: number, y: number) => ({ title: String.fromCharCode('A'.charCodeAt(0) + (y * 2 + x)) }) }); p.addBinding({ flag: true }, 'flag'); }
      }

      // C3 fill (three per side)
      {
        const [l, r] = c3.getSlots();
        if (l) {
          const p = new Pane({ container: l }); ensureRegistered(p);
          p.addBinding({ p: { x: 0.3, y: 0.7 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } });
          p.addBinding({ on: false }, 'on');
          p.addBinding({ txt: 'note' }, 'txt');
        }
        if (r) {
          const p = new Pane({ container: r }); ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, z: { min: 0, max: 1 } });
          p.addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] });
          p.addBlade({ view: 'fpsgraph' });
        }
      }
    });
  }
}

main();

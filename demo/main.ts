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
type FolderLike = { addBinding: (obj: Record<string, unknown>, key: string, params?: Record<string, unknown>) => unknown; addBlade?: (p: Record<string, unknown>) => unknown };

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

// (sparkline demo removed)

// Donut gauge (value 0..100) to showcase mixed DOM + controls
function drawDonutGauge(
  container: HTMLElement,
  value: number,
  options?: { color?: string; thickness?: number; rounded?: boolean }
) {
  const color = options?.color ?? '#22d3ee';
  const thickness = Math.max(2, Math.min(24, Math.floor(options?.thickness ?? 10)));
  const rounded = !!options?.rounded;

  // Clear previous content
  container.innerHTML = '';

  const canvas = document.createElement('canvas');
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.max(8, Math.min(cx, cy) - thickness);
  const start = -Math.PI / 2; // top
  const end = start + (Math.max(0, Math.min(100, value)) / 100) * Math.PI * 2;

  // Track
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = thickness;
  ctx.lineCap = rounded ? 'round' : 'butt';
  ctx.stroke();

  // Value arc
  ctx.beginPath();
  ctx.arc(cx, cy, R, start, end);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = rounded ? 'round' : 'butt';
  ctx.stroke();

  // Center text
  const pct = Math.round(Math.max(0, Math.min(100, value)));
  ctx.fillStyle = '#e5e7eb';
  ctx.font = `${Math.floor(Math.min(W, H) * 0.28)}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${pct}%`, cx, cy);
}

function main() {
  // Basics 1/3 — First Split
  const hostA = document.getElementById('host-a') as HTMLElement | null;
  if (hostA) {
    const paneA = new Pane({ container: hostA, title: 'Basics 1/3 — First Split' });
    ensureRegistered(paneA);
    try { paneA.registerPlugin(Essentials); } catch {}

    const row = paneA.addBlade({
      view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
      children: ['leaf', 'leaf']
    }) as unknown as SplitApi;
    const [L, R] = row.getSlots();
    const pL = new Pane({ container: L });
    ensureRegistered(pL);
    pL.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });
    const text = document.createElement('div');
    text.style.padding = '8px';
    text.style.color = '#888';
    text.style.fontSize = '10px';
    text.style.lineHeight = '1.5';
    text.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    text.innerHTML = 'Left: Multi-height button (3u)<br>Right: Custom DOM with controllable height';
    R.appendChild(text);
  }

  // Basics 2/3 — Size Expressions
  const hostB = document.getElementById('host-b') as HTMLElement | null;
  if (hostB) {
    const paneB = new Pane({ container: hostB, title: 'Basics 2/3 — Size Expressions' });
    ensureRegistered(paneB);
    try { paneB.registerPlugin(Essentials); } catch {}

    // 66 / 34
    const rA = paneB.addBlade({ view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['leaf', 'leaf'] }) as unknown as SplitApi;
    rA.getSlots().forEach((slot: HTMLElement, i: number) => {
      const p = new Pane({ container: slot });
      if ((rA as any).wrapPane) { (rA as any).wrapPane(p); }
      ensureRegistered(p);
      p.addBlade({ view: 'sized-button', title: `Button\n${i + 1}`, units: 2 });
    });

    // equal — 3 columns
    const rB = paneB.addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf', 'leaf'] }) as unknown as SplitApi;
    rB.getSlots().forEach((slot: HTMLElement, i: number) => {
      const p = new Pane({ container: slot });
      if ((rB as any).wrapPane) { (rB as any).wrapPane(p); }
      ensureRegistered(p);
      p.addBlade({ view: 'sized-button', title: `Equal\n${i + 1}`, units: 2 });
    });

    // 1fr 2fr
    const rC = paneB.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf', 'leaf'] }) as unknown as SplitApi;
    rC.getSlots().forEach((slot: HTMLElement, i: number) => {
      const p = new Pane({ container: slot });
      if ((rC as any).wrapPane) { (rC as any).wrapPane(p); }
      ensureRegistered(p);
      p.addBlade({ view: 'sized-button', title: i === 0 ? '1fr' : '2fr', units: 2 });
    });
  }

  // Basics 3/3 — Normalized + Mixed DOM
  const hostC = document.getElementById('host-c') as HTMLElement | null;
  if (hostC) {
    const paneC = new Pane({ container: hostC, title: 'Basics 3/3 — Normalized + Mixed DOM' });
    ensureRegistered(paneC);
    try { paneC.registerPlugin(Essentials); } catch {}

    // 40 10 (normalized)
    const rN = paneC.addBlade({ view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf', 'leaf'] }) as unknown as SplitApi;
    rN.getSlots().forEach((slot: HTMLElement) => {
      const p = new Pane({ container: slot });
      if ((rN as any).wrapPane) { (rN as any).wrapPane(p); }
      ensureRegistered(p);
      p.addBlade({ view: 'sized-button', title: `Normalized`, units: 2 });
    });

    // Donut gauge + controls
    const rG = paneC.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6, interactive: true, children: ['leaf', 'leaf'] }) as unknown as SplitApi;
    const [gL, gR] = rG.getSlots();
    const gaugeState = { value: 64, thickness: 10, rounded: true, color: '#22d3ee' };
    let leftPaneForGauge: Pane | null = null;
    if (gL) {
      leftPaneForGauge = new Pane({ container: gL });
      if ((rG as any).wrapPane) { (rG as any).wrapPane(leftPaneForGauge); }
      ensureRegistered(leftPaneForGauge);
      try { leftPaneForGauge.registerPlugin(Essentials); } catch {}
      leftPaneForGauge.addBinding(gaugeState, 'value', { min: 0, max: 100, label: 'Value' });
      leftPaneForGauge.addBinding(gaugeState, 'thickness', { min: 4, max: 20, step: 1, label: 'Thickness' });
      leftPaneForGauge.addBinding(gaugeState, 'rounded', { label: 'Rounded' });
      leftPaneForGauge.addBinding(gaugeState, 'color', { label: '' }); // hide this label only
    }
    let gaugeBox: HTMLElement | null = null;
    if (gR) { mountDomUnits(gR, 4, (box) => { gaugeBox = box; }); }
    const renderGauge = () => {
      if (gaugeBox) drawDonutGauge(gaugeBox, gaugeState.value, {
        color: gaugeState.color, thickness: gaugeState.thickness, rounded: gaugeState.rounded,
      });
    };
    renderGauge();
    try { leftPaneForGauge?.on('change', renderGauge); } catch {}
  }

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
      const pl = new Pane({ container: L }); if ((api as any).wrapPane) { (api as any).wrapPane(pl); } ensureRegistered(pl);
      const pr = new Pane({ container: R }); if ((api as any).wrapPane) { (api as any).wrapPane(pr); } ensureRegistered(pr);
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
    const c3 = pane3.addBlade({
      view: 'split-layout',
      direction: 'row',
      sizes: '1fr 2fr',
      children: [
        {
          view: 'split-layout',
          direction: 'column',
          rowUnits: '1 1 1',  // Use rowUnits to auto-calculate height
          compactSliders: false,  // Non-compact for left side
          children: ['alpha', 'alpha', 'alpha']
        },
        'gamma'
      ]
    }) as unknown as SplitApi;

    // Fill on the next frame to avoid any initial measurement race
    requestAnimationFrame(() => {
      // C1 fill
      {
        const [l, r] = c1.getSlots();
        if (l) { const p = new Pane({ container: l }); if ((c1 as any).wrapPane) { (c1 as any).wrapPane(p); } ensureRegistered(p); p.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 }); }
        if (r) {
          const p = new Pane({ container: r }); if ((c1 as any).wrapPane) { (c1 as any).wrapPane(p); } ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ v: 42 }, 'v', { min: 0, max: 100, label: 'Level' });
          p.addBinding({ on: true }, 'on', { label: 'Enabled' });
          p.addBinding({ mode: 'a' }, 'mode', { options: { Alpha: 'a', Beta: 'b', Gamma: 'g' } });
        }
      }

      // C2 fill (two controls per column, no labels to keep compact)
      {
        const [a, b, g] = c2.getSlots();
        if (a) { const p = new Pane({ container: a }); if ((c2 as any).wrapPane) { (c2 as any).wrapPane(p); } ensureRegistered(p); p.addButton({ title: 'Action' }); p.addBinding({ text: 'hello' }, 'text'); }
        if (b) { const p = new Pane({ container: b }); if ((c2 as any).wrapPane) { (c2 as any).wrapPane(p); } ensureRegistered(p); p.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 }); p.addBinding({ c: '#22d3ee' }, 'c'); }
        if (g) { const p = new Pane({ container: g }); if ((c2 as any).wrapPane) { (c2 as any).wrapPane(p); } ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {} p.addBlade({ view: 'buttongrid', size: [2, 2], cells: (x: number, y: number) => ({ title: String.fromCharCode('A'.charCodeAt(0) + (y * 2 + x)) }) }); }
      }

      // C3 fill (three per side)
      {
        const leftSlots = (c3 as any).getSlotsByCategory ? (c3 as any).getSlotsByCategory('alpha') : [];
        const rightSlots = (c3 as any).getSlotsByCategory ? (c3 as any).getSlotsByCategory('gamma') : [];

        // Fill left side (non-compact)
        if (leftSlots[0]) {
          const p = new Pane({ container: leftSlots[0] });
          ensureRegistered(p);
          const api = p.addBinding({ p: { x: 0.3, y: 0.7 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } });
          // Manually remove label since we're not using wrapPane
          try {
            const el = (api as any)?.controller?.view?.element as HTMLElement | undefined;
            const lbl = el?.querySelector('.tp-lblv_l') as HTMLElement | null;
            if (lbl) { lbl.remove(); el?.classList.add('tp-lblv-nol'); }
          } catch {}
        }
        if (leftSlots[1]) {
          const p = new Pane({ container: leftSlots[1] });
          ensureRegistered(p);
          p.addBinding({ on: false }, 'on', { label: 'Enabled' });
        }
        if (leftSlots[2]) {
          const p = new Pane({ container: leftSlots[2] });
          ensureRegistered(p);
          p.addBinding({ volume: 50 }, 'volume', { min: 0, max: 100, label: 'Volume' });
          const api2 = p.addBinding({ txt: 'note' }, 'txt');
          // Manually remove label since we're not using wrapPane
          try {
            const el = (api2 as any)?.controller?.view?.element as HTMLElement | undefined;
            const lbl = el?.querySelector('.tp-lblv_l') as HTMLElement | null;
            if (lbl) { lbl.remove(); el?.classList.add('tp-lblv-nol'); }
          } catch {}
        }

        // Fill right side (compact)
        if (rightSlots[0]) {
          const p = new Pane({ container: rightSlots[0] });
          if ((c3 as any).wrapPane) { (c3 as any).wrapPane(p); }
          ensureRegistered(p);
          try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, z: { min: 0, max: 1 } });
          p.addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] });

          // Replace fpsgraph with a sub-split
          const subSplit = p.addBlade({
            view: 'split-layout',
            direction: 'row',
            sizes: '80px 1fr',
            children: ['left', 'right']
          }) as any;

          const [btnSlot, graphSlot] = subSplit.getSlots();

          // Left: 2-unit high button
          if (btnSlot) {
            const btnPane = new Pane({ container: btnSlot });
            if ((c3 as any).wrapPane) { (c3 as any).wrapPane(btnPane); }
            ensureRegistered(btnPane);
            btnPane.addBlade({ view: 'sized-button', title: 'Monitor\nGraph', units: 2 });
          }

          // Right: graph blade (native tweakpane)
          if (graphSlot) {
            const graphPane = new Pane({ container: graphSlot });
            if ((c3 as any).wrapPane) { (c3 as any).wrapPane(graphPane); }
            ensureRegistered(graphPane);
            // Note: DO NOT register essentials for native graph

            // Create a parameter object for monitoring
            const graphParams = {
              wave: 0  // Initial value
            };

            // Create the graph binding
            const graphBinding = graphPane.addBinding(
              graphParams,
              'wave',
              {
                view: 'graph',
                readonly: true,
                min: -1,
                max: 1,
              }
            );

            // Update the value periodically to show animation
            let time = 0;
            const updateGraph = () => {
              time += 0.1;
              graphParams.wave = Math.sin(time);
              // graphBinding.refresh();  // May need to call refresh
            };

            // Set up interval to update graph
            const interval = setInterval(updateGraph, 50);

            // Clean up on disposal
            if (graphSlot.dispose) {
              const originalDispose = graphSlot.dispose;
              graphSlot.dispose = () => {
                clearInterval(interval);
                originalDispose();
              };
            }
          }
        }
      }
    });
  }
}

main();

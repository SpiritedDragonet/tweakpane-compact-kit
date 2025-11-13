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

function drawWave(container: HTMLElement, stroke = '#22d3ee', bg = '#0f172a') {
  const canvas = document.createElement('canvas');
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Scale for retina displays
  ctx.scale(dpr, dpr);

  // Clear background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Calculate wave parameters
  const centerY = rect.height / 2;
  const amplitude = rect.height * 0.25;
  const frequency = 0.02;
  const points = 150;
  const lineWidth = 2.5;

  // Create wave data
  const wavePoints: Array<{x: number, y: number}> = [];
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * rect.width;
    const angle = i * frequency * Math.PI * 2;

    // Complex wave with multiple layers
    let y = centerY;
    y += Math.sin(angle) * amplitude * 0.8;
    y += Math.sin(angle * 2.1) * amplitude * 0.3;
    y += Math.sin(angle * 3.7) * amplitude * 0.15;

    wavePoints.push({x, y});
  }

  // Draw subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = (rect.height / 4) * i;
    ctx.moveTo(0, y);
    ctx.lineTo(rect.width, y);
  }
  ctx.stroke();

  // Create filled area under the wave
  const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
  gradient.addColorStop(0, stroke + '00');
  gradient.addColorStop(0.3, stroke + '10');
  gradient.addColorStop(0.5, stroke + '20');
  gradient.addColorStop(0.7, stroke + '10');
  gradient.addColorStop(1, stroke + '00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(wavePoints[0].x, centerY);
  wavePoints.forEach(point => ctx.lineTo(point.x, point.y));
  ctx.lineTo(wavePoints[wavePoints.length - 1].x, centerY);
  ctx.closePath();
  ctx.fill();

  // Draw the main wave line
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Add subtle glow
  ctx.shadowColor = stroke;
  ctx.shadowBlur = 15;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.beginPath();
  ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
  for (let i = 1; i < wavePoints.length; i++) {
    const cp1x = wavePoints[i - 1].x + (wavePoints[i].x - wavePoints[i - 1].x) / 2;
    const cp1y = wavePoints[i - 1].y;
    const cp2x = wavePoints[i - 1].x + (wavePoints[i].x - wavePoints[i - 1].x) / 2;
    const cp2y = wavePoints[i].y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, wavePoints[i].x, wavePoints[i].y);
  }
  ctx.stroke();

  // Remove shadow for dots
  ctx.shadowBlur = 0;

  // Draw peak dots
  const dotSize = 3;
  ctx.fillStyle = stroke;
  for (let i = 0; i < wavePoints.length; i += 15) {
    ctx.beginPath();
    ctx.arc(wavePoints[i].x, wavePoints[i].y, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw start and end dots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(wavePoints[0].x, wavePoints[0].y, dotSize + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(wavePoints[wavePoints.length - 1].x, wavePoints[wavePoints.length - 1].y, dotSize + 1, 0, Math.PI * 2);
  ctx.fill();
}

function main() {
  const host = document.getElementById('host') as HTMLElement | null;
  if (!host) return;

  const pane = new Pane({ container: host, title: 'Compact Kit — Rows' });
  ensureRegistered(pane);
  try { pane.registerPlugin(Essentials); } catch {}

  // Row 1: Quick peek — Multiline button + custom DOM text
  const row1 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
    children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  const r1 = row1.getSlots();
  const r1l = new Pane({ container: r1[0] });
  ensureRegistered(r1l);
  r1l.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });

  // Custom DOM on the right
  const textContainer = document.createElement('div');
  textContainer.style.padding = '8px';
  textContainer.style.color = '#888';
  textContainer.style.fontSize = '10px';
  textContainer.style.lineHeight = '1.5';
  textContainer.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  textContainer.innerHTML = 'Left: Multi-height button (3u)<br>Right: Custom DOM with controllable height';
  r1[1].appendChild(textContainer);

  // Row 2: 66 / 34
  const row2 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row2.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    // Hide default auto-labels for bindings in this leaf unless explicitly provided
    if ((row2 as any).wrapPane) { (row2 as any).wrapPane(p); }
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Button\n${i + 1}`, units: 2 });
  });

  // Row 3: equal — 3 columns
  const row3 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf', 'leaf']
  }) as unknown as SplitApi;
  row3.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    if ((row3 as any).wrapPane) { (row3 as any).wrapPane(p); }
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Equal\n${i + 1}`, units: 2 });
  });

  // Row 4: 1fr 2fr
  const row4 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row4.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    if ((row4 as any).wrapPane) { (row4 as any).wrapPane(p); }
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `1fr\n2fr`, units: 2 });
  });

  // Row 5: 40 10 (normalized)
  const row5 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf', 'leaf']
  }) as unknown as SplitApi;
  row5.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    if ((row5 as any).wrapPane) { (row5 as any).wrapPane(p); }
    ensureRegistered(p);
    p.addBlade({ view: 'sized-button', title: `Normalized`, units: 2 });
  });

  // Row 6: 3u waveform (using drawWave)
  const row6 = pane.addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr', children: ['leaf']
  }) as unknown as SplitApi;
  const r6 = row6.getSlots();

  // Use mountDomUnits to create a 3-unit container for the wave
  mountDomUnits(r6[0], 3, (container) => {
    drawWave(container, '#22d3ee', '#0f172a');
  });

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

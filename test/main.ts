// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';
import * as Essentials from '@tweakpane/plugin-essentials';
import * as Essentials from '@tweakpane/plugin-essentials';

// Utilities
function ensureRegistered(pane: Pane) {
  try { pane.registerPlugin(CompactKitBundle as any); } catch (e) {
    throw e;
  }
}

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
  try { pane.registerPlugin(Essentials as any); } catch {}

  // Row 1: Quick peek — Multiline button + DOM side-by-side
  const row1: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
    children: ['leaf', 'leaf']
  });
  const r1 = row1.getSlots();
  const r1l = new Pane({ container: r1[0] });
  ensureRegistered(r1l);
  (r1l as any).addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 });
  mountDomUnits(r1[1], 3, (box) => {
    const p = document.createElement('div');
    p.textContent = 'This is a plain DOM area';
    p.style.margin = '4px 0 0';
    p.style.color = '#888';
    p.style.fontSize = '11px';
    box.appendChild(p);
  });

  // Row 2: 66 / 34
  const row2: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: [66, 34], children: ['leaf', 'leaf']
  });
  row2.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    (p as any).addBlade({ view: 'sized-button', title: `Button\n${i + 1}`, units: 2 });
  });

  // Row 3: equal — 3 columns
  const row3: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf', 'leaf']
  });
  row3.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    (p as any).addBlade({ view: 'sized-button', title: `Equal\n${i + 1}`, units: 2 });
  });

  // Row 4: 1fr 2fr
  const row4: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf', 'leaf']
  });
  row4.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    (p as any).addBlade({ view: 'sized-button', title: `1fr\n2fr`, units: 2 });
  });

  // Row 5: 40 10 (normalized)
  const row5: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf', 'leaf']
  });
  row5.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    ensureRegistered(p);
    (p as any).addBlade({ view: 'sized-button', title: `Normalized`, units: 2 });
  });

  // Row 6: 3u DOM with a tiny waveform (arbitrary HTML)
  const row6: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr', children: ['leaf']
  });
  const r6 = row6.getSlots();
  mountDomUnits(r6[0], 3, (box) => drawWave(box, '#22d3ee', '#0f172a'));

  // Section 2: Compact sliders toggle (pure API)
  const host2 = document.getElementById('host-compact') as HTMLElement | null;
  if (host2) {
    const pane2 = new Pane({ container: host2, title: 'Compact vs Original' });
    ensureRegistered(pane2);
    try { pane2.registerPlugin(Essentials as any); } catch {}

    const state = { compact: true, a: 50, b: 0.25 };
    let api: any | null = null;
    const render = () => {
      if (api) { try { api.dispose(); } catch {} api = null; }
      api = (pane2 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 1fr', children: ['leaf','leaf'], compactSliders: state.compact });
      const [L, R] = api.getSlots();
      const pl = new Pane({ container: L }); ensureRegistered(pl); try { pl.registerPlugin(Essentials as any); } catch {}
      const pr = new Pane({ container: R }); ensureRegistered(pr); try { pr.registerPlugin(Essentials as any); } catch {}
      pl.addBinding(state, 'a', { min: 0, max: 100 });
      pr.addBinding(state, 'b', { min: 0, max: 1 });
    };
    render();
    const ctl = pane2.addBinding(state, 'compact');
    (ctl as any).on('change', () => render());
  }

  // Section 3: Custom categories — build inner columns on next frame to avoid race
  const host3 = document.getElementById('host-cats') as HTMLElement | null;
  if (host3) {
    const pane3 = new Pane({ container: host3, title: 'Semantic Leaves' });
    ensureRegistered(pane3);
    try { pane3.registerPlugin(Essentials as any); } catch {}

    // C1: 66/34 — left 3u single, right 1u+1u+1u
    const c1: any = (pane3 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: [66,34], children: ['alpha','beta'] });
    const [c1L, c1R] = c1.getSlots();
    requestAnimationFrame(() => {
      const pL = new Pane({ container: c1L }); ensureRegistered(pL);
      (pL as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[3], children:['alpha'] });
      const pR = new Pane({ container: c1R }); ensureRegistered(pR);
      (pR as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[1,1,1], children:['beta','beta','beta'] });

      // fill
      const aSlots = pL.controller.view.element.querySelectorAll('.tp-split-leaf');
      const bSlots = pR.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (aSlots[0]) { const p = new Pane({ container: aSlots[0] as HTMLElement }); ensureRegistered(p); (p as any).addBlade({ view:'sized-button', title:'3u\nButton', units:3 }); }
      if (bSlots[0]) { const p = new Pane({ container: bSlots[0] as HTMLElement }); ensureRegistered(p); p.addBinding({ v: 25 }, 'v', { min:0, max:100 }); }
      if (bSlots[1]) { const p = new Pane({ container: bSlots[1] as HTMLElement }); ensureRegistered(p); p.addBinding({ on: true }, 'on'); }
      if (bSlots[2]) { const p = new Pane({ container: bSlots[2] as HTMLElement }); ensureRegistered(p); p.addBinding({ sel:'a' } as any, 'sel', { options:{ A:'a', B:'b', C:'c' } }); }
    });

    // C2: equal — three columns, each 1u+1u
    const c2: any = (pane3 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['alpha','beta','gamma'] });
    requestAnimationFrame(() => {
      const [s0, s1, s2] = c2.getSlots();
      const p0 = new Pane({ container: s0 }); ensureRegistered(p0); (p0 as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[1,1], children:['alpha','alpha'] });
      const p1 = new Pane({ container: s1 }); ensureRegistered(p1); (p1 as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[1,1], children:['beta','beta'] });
      const p2 = new Pane({ container: s2 }); ensureRegistered(p2); (p2 as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[1,1], children:['gamma','gamma'] });

      // fill
      const [a0,a1] = p0.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (a0) { const p = new Pane({ container: a0 as HTMLElement }); ensureRegistered(p); p.addBinding({ s:'hello' } as any, 's'); }
      if (a1) { const p = new Pane({ container: a1 as HTMLElement }); ensureRegistered(p); p.addButton({ title:'Action' }); }
      const [b0,b1] = p1.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (b0) { const p = new Pane({ container: b0 as HTMLElement }); ensureRegistered(p); p.addBinding({ n:3.14 }, 'n', { min:0, max:10 }); }
      if (b1) { const p = new Pane({ container: b1 as HTMLElement }); ensureRegistered(p); p.addBinding({ c:'#22d3ee' } as any, 'c'); }
      const [g0,g1] = p2.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (g0) { const p = new Pane({ container: g0 as HTMLElement }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {} (p as any).addBlade({ view:'buttongrid', size:[2,2], cells:(x:number,y:number)=>({ title: String.fromCharCode('A'.charCodeAt(0)+(y*2+x)) }) }); }
      if (g1) { const p = new Pane({ container: g1 as HTMLElement }); ensureRegistered(p); p.addBinding({ flag:true }, 'flag'); }
    });

    // C3: 1fr 2fr — left 1+1+1, right 3+1+1
    const c3: any = (pane3 as any).addBlade({ view:'split-layout', direction:'row', sizes:'1fr 2fr', children:['alpha','gamma'] });
    requestAnimationFrame(() => {
      const [sL, sR] = c3.getSlots();
      const pL = new Pane({ container: sL }); ensureRegistered(pL); (pL as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[1,1,1], children:['alpha','alpha','alpha'] });
      const pR = new Pane({ container: sR }); ensureRegistered(pR); (pR as any).addBlade({ view:'split-layout', direction:'column', rowUnits:[3,1,1], children:['gamma','gamma','gamma'] });

      // fill left
      const [l0,l1,l2] = pL.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (l0) { const p = new Pane({ container: l0 as HTMLElement }); ensureRegistered(p); p.addBinding({ p:{ x:0.3,y:0.7 } } as any, 'p', { x:{min:0,max:1}, y:{min:0,max:1} }); }
      if (l1) { const p = new Pane({ container: l1 as HTMLElement }); ensureRegistered(p); p.addBinding({ on:false }, 'on'); }
      if (l2) { const p = new Pane({ container: l2 as HTMLElement }); ensureRegistered(p); p.addBinding({ txt:'note' } as any, 'txt'); }
      // fill right (gamma)
      const [r0,r1,r2] = pR.controller.view.element.querySelectorAll('.tp-split-leaf');
      if (r0) { const p = new Pane({ container: r0 as HTMLElement }); ensureRegistered(p); p.addBinding({ p:{ x:0.1,y:0.5,z:0.9 } } as any, 'p', { x:{min:0,max:1}, y:{min:0,max:1}, z:{min:0,max:1} }); }
      if (r1) { const p = new Pane({ container: r1 as HTMLElement }); ensureRegistered(p); p.addBinding({ v:0.25 }, 'v', { min:0, max:1 }); }
      if (r2) { const p = new Pane({ container: r2 as HTMLElement }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {} (p as any).addBlade({ view:'cubicbezier', value:[0.5,0.2,0.5,1] }); }
    });
  }

  // Section 2: Compact sliders toggle
  const host2 = document.getElementById('host-compact') as HTMLElement | null;
  if (host2) {
    const pane2 = new Pane({ container: host2, title: 'Compact vs Original' });
    ensureRegistered(pane2);
    try { pane2.registerPlugin(Essentials as any); } catch {}

    const state = { compact: true, a: 50, b: 0.25 };
    let rowApi: any | null = null;

    const render = () => {
      if (rowApi) { try { rowApi.dispose(); } catch {} rowApi = null; }
      const api: any = (pane2 as any).addBlade({
        view: 'split-layout',
        direction: 'row',
        sizes: '1fr 1fr',
        compactSliders: state.compact,
        children: ['leaf', 'leaf']
      });
      rowApi = api;
      const [L, R] = api.getSlots();
      const pl = new Pane({ container: L }); ensureRegistered(pl); try { pl.registerPlugin(Essentials as any); } catch {}
      const pr = new Pane({ container: R }); ensureRegistered(pr); try { pr.registerPlugin(Essentials as any); } catch {}
      pl.addBinding(state, 'a', { min: 0, max: 100 });
      pr.addBinding(state, 'b', { min: 0, max: 1 });
    };

    render();
    const ctl = pane2.addBinding(state, 'compact');
    (ctl as any).on('change', () => render());
  }

  // Section 3: Custom categories (dense, equal occupancy per column)
  const host3 = document.getElementById('host-cats') as HTMLElement | null;
  if (host3) {
    const pane3 = new Pane({ container: host3, title: 'Semantic Leaves' });
    ensureRegistered(pane3);
    try { pane3.registerPlugin(Essentials as any); } catch {}

    // Row C1: 66 / 34, left 3u (one leaf), right 1u+1u+1u (three leaves)
    const c1: any = (pane3 as any).addBlade({
      view: 'split-layout', direction: 'row', sizes: [66, 34], children: [
        { view: 'split-layout', direction: 'column', rowUnits: [3], children: ['alpha'] },
        { view: 'split-layout', direction: 'column', rowUnits: [1,1,1], children: ['beta','beta','beta'] },
      ]
    });

    // Row C2: equal (3 cols), each column = 1u + 1u
    const c2: any = (pane3 as any).addBlade({
      view: 'split-layout', direction: 'row', sizes: 'equal', children: [
        { view: 'split-layout', direction: 'column', rowUnits: [1,1], children: ['alpha','alpha'] },
        { view: 'split-layout', direction: 'column', rowUnits: [1,1], children: ['beta','beta'] },
        { view: 'split-layout', direction: 'column', rowUnits: [1,1], children: ['gamma','gamma'] },
      ]
    });

    // Row C3: 1fr 2fr, left 1+1+1, right 1+1+1
    const c3: any = (pane3 as any).addBlade({
      view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: [
        { view: 'split-layout', direction: 'column', rowUnits: [1,1,1], children: ['alpha','alpha','alpha'] },
        // Allocate more height for heavier components (e.g., cubicbezier)
        { view: 'split-layout', direction: 'column', rowUnits: [3,1,1], children: ['gamma','gamma','gamma'] },
      ]
    });

    // Gather slots by category across rows
    const alpha = [ ...c1.getSlotsByCategory('alpha'), ...c2.getSlotsByCategory('alpha'), ...c3.getSlotsByCategory('alpha') ];
    const beta  = [ ...c1.getSlotsByCategory('beta'),  ...c2.getSlotsByCategory('beta')  ];
    const gamma = [ ...c2.getSlotsByCategory('gamma'), ...c3.getSlotsByCategory('gamma') ];

    // Fill alpha (6 slots): [3u sized-button], button, folder, tab, string, separator
    if (alpha[0]) { const p = new Pane({ container: alpha[0] }); ensureRegistered(p); (p as any).addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 }); }
    if (alpha[1]) { const p = new Pane({ container: alpha[1] }); ensureRegistered(p); p.addButton({ title: 'Action' }); }
    if (alpha[2]) { const p = new Pane({ container: alpha[2] }); ensureRegistered(p); const f = (p as any).addFolder({ title: 'Folder' }); (f as any).addBinding({ x: 1 }, 'x'); }
    if (alpha[3]) { const p = new Pane({ container: alpha[3] }); ensureRegistered(p); const t = (p as any).addTab({ pages: [{ title: 'A' }, { title: 'B' }] }); const p0 = (t as any).pages[0]; (p0 as any).addBinding({ flag: true }, 'flag'); }
    if (alpha[4]) { const p = new Pane({ container: alpha[4] }); ensureRegistered(p); p.addBinding({ text: 'hello' } as any, 'text'); }
    if (alpha[5]) { const p = new Pane({ container: alpha[5] }); ensureRegistered(p); (p as any).addBlade({ view: 'separator' }); }

    // Fill beta (5 slots): slider, dropdown, boolean, number, color
    if (beta[0]) { const p = new Pane({ container: beta[0] }); ensureRegistered(p); p.addBinding({ v: 42 }, 'v', { min: 0, max: 100 }); }
    if (beta[1]) { const p = new Pane({ container: beta[1] }); ensureRegistered(p); p.addBinding({ mode: 'a' } as any, 'mode', { options: { Alpha: 'a', Beta: 'b', Gamma: 'g' } }); }
    if (beta[2]) { const p = new Pane({ container: beta[2] }); ensureRegistered(p); p.addBinding({ on: true }, 'on'); }
    if (beta[3]) { const p = new Pane({ container: beta[3] }); ensureRegistered(p); p.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 }); }
    if (beta[4]) { const p = new Pane({ container: beta[4] }); ensureRegistered(p); p.addBinding({ c: '#22d3ee' } as any, 'c'); }

    // Fill gamma (5+ slots): buttongrid, color, vec2, vec3, cubicbezier, fpsgraph (as many as slots allow)
    if (gamma[0]) { const p = new Pane({ container: gamma[0] }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {} (p as any).addBlade({ view: 'buttongrid', size: [2, 2], cells: (x: number, y: number) => ({ title: String.fromCharCode('A'.charCodeAt(0) + (y * 2 + x)) }) }); }
    if (gamma[1]) { const p = new Pane({ container: gamma[1] }); ensureRegistered(p); p.addBinding({ c: '#ff7b7b' } as any, 'c'); }
    if (gamma[2]) { const p = new Pane({ container: gamma[2] }); ensureRegistered(p); p.addBinding({ p: { x: 0.3, y: 0.7 } } as any, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } }); }
    if (gamma[3]) { const p = new Pane({ container: gamma[3] }); ensureRegistered(p); p.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } } as any, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, z: { min: 0, max: 1 } }); }
    if (gamma[4]) { const p = new Pane({ container: gamma[4] }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {} (p as any).addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] }); }
    if (gamma[5]) { const p = new Pane({ container: gamma[5] }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {} (p as any).addBlade({ view: 'fpsgraph' }); }

    // Footer note (visual hint)
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = 'Hint: With compact layout, omitting label fields often looks cleaner.';
    host3.appendChild(note);
  }
}

main();

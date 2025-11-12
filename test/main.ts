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

// No direct DOM editing in demo below; only Tweakpane API

function main() {
  const host = document.getElementById('host') as HTMLElement | null;
  if (!host) return;

  const pane = new Pane({ container: host, title: 'Compact Kit — Rows' });
  ensureRegistered(pane);
  try { pane.registerPlugin(Essentials as any); } catch {}
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
  const r1r = new Pane({ container: r1[1] });
  ensureRegistered(r1r);
  // Use another 3u sized button as an info placeholder (no DOM edits)
  (r1r as any).addBlade({ view: 'sized-button', title: 'Info\n(3u pane)', units: 3 });

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
  const r6p = new Pane({ container: r6[0] });
  ensureRegistered(r6p);
  // Showcase: 3 units of mixed controls (no labels)
  r6p.addBinding({ a: 42 }, 'a', { min: 0, max: 100 });
  r6p.addBinding({ b: true }, 'b');
  r6p.addBinding({ c: '#22d3ee' } as any, 'c');

  // Section 2: Compact sliders toggle
  const host2 = document.getElementById('host-compact') as HTMLElement | null;
  if (host2) {
    const pane2 = new Pane({ container: host2, title: 'Compact vs Original' });
    ensureRegistered(pane2);
    try { pane2.registerPlugin(Essentials as any); } catch {}

    const state = { compact: true, a: 50, b: 0.25 };
    let api: any | null = null;
    const render = () => {
      if (api) { try { api.dispose(); } catch {} api = null; }
      api = (pane2 as any).addBlade({
        view: 'split-layout', direction: 'row', sizes: '1fr 1fr', children: ['leaf','leaf'], compactSliders: state.compact
      });
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

  // Section 3: Custom categories (no DOM, no rowUnits)
  const host3 = document.getElementById('host-cats') as HTMLElement | null;
  if (host3) {
    const pane3 = new Pane({ container: host3, title: 'Semantic Leaves' });
    ensureRegistered(pane3);
    try { pane3.registerPlugin(Essentials as any); } catch {}

    // Row C1: 66/34 — left 3u button; right 3 x 1u controls
    const c1: any = (pane3 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: [66,34], children: ['alpha','beta'] });
    const [c1L, c1R] = c1.getSlots();
    const c1pL = new Pane({ container: c1L }); ensureRegistered(c1pL);
    (c1pL as any).addBlade({ view: 'sized-button', title: '3u\nButton', units: 3 });
    const c1pR = new Pane({ container: c1R }); ensureRegistered(c1pR); try { c1pR.registerPlugin(Essentials as any); } catch {}
    c1pR.addBinding({ v: 25 }, 'v', { min: 0, max: 100 });
    c1pR.addBinding({ on: true }, 'on');
    c1pR.addBinding({ sel: 'a' } as any, 'sel', { options: { A: 'a', B: 'b', C: 'c' } });

    // Row C2: equal 3 columns — each column two controls
    const c2: any = (pane3 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['alpha','beta','gamma'] });
    c2.getSlots().forEach((slot: HTMLElement, i: number) => {
      const p = new Pane({ container: slot }); ensureRegistered(p); try { p.registerPlugin(Essentials as any); } catch {}
      if (i === 0) { p.addBinding({ s: 'hello' } as any, 's'); p.addButton({ title: 'Action' }); }
      if (i === 1) { p.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 }); p.addBinding({ c: '#22d3ee' } as any, 'c'); }
      if (i === 2) { (p as any).addBlade({ view: 'buttongrid', size: [2,2], cells: (x: number, y: number) => ({ title: String.fromCharCode('A'.charCodeAt(0) + (y*2+x)) }) }); p.addBinding({ flag: true }, 'flag'); }
    });

    // Row C3: 1fr 2fr — both sides three controls（vec2/vec3 included）
    const c3: any = (pane3 as any).addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['alpha','gamma'] });
    const [c3L, c3R] = c3.getSlots();
    const c3pL = new Pane({ container: c3L }); ensureRegistered(c3pL);
    c3pL.addBinding({ p: { x: 0.3, y: 0.7 } } as any, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 } });
    c3pL.addBinding({ on: false }, 'on');
    c3pL.addBinding({ txt: 'note' } as any, 'txt');
    const c3pR = new Pane({ container: c3R }); ensureRegistered(c3pR);
    c3pR.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } } as any, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, z: { min: 0, max: 1 } });
    c3pR.addBinding({ v: 0.25 }, 'v', { min: 0, max: 1 });
    try { c3pR.registerPlugin(Essentials as any); } catch {}
    (c3pR as any).addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] });
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

// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';
import * as Essentials from '@tweakpane/plugin-essentials';
import { renderDonutGaugeSvg } from '../src/demo/donutGaugeSvg';

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
  wrapPane?: (pane: Pane) => void;
  dispose?: () => void;
};

type FolderLike = {
  addBinding: (
    obj: Record<string, unknown>,
    key: string,
    params?: Record<string, unknown>
  ) => unknown;
  addBlade?: (params: Record<string, unknown>) => unknown;
  addButton?: (params: { title: string }) => unknown;
};

type PaneWithFolder = Pane & {
  addFolder?: (params: { title: string; expanded?: boolean }) => FolderLike | undefined;
};

const ICONS = {
  sliders: {
    path: 'M3 4h10M2 8h12M5 12h6',
    viewBox: '0 0 16 16',
  },
  power: {
    path: 'M8 2v5M5.2 4.5a4.5 4.5 0 1 0 5.6 0',
    viewBox: '0 0 16 16',
  },
  graph: {
    path: 'M2.5 11.5 6 8l2.5 2.5 5-6M3 3v10h10',
    viewBox: '0 0 16 16',
  },
} as const;

function toSplitApi(v: unknown): SplitApi {
  return v as SplitApi;
}

function tryWrapPane(split: SplitApi, pane: Pane): void {
  try { split.wrapPane?.(pane); } catch {}
}

function createChildPane(split: SplitApi, slot: HTMLElement, options?: { essentials?: boolean }) {
  const pane = new Pane({ container: slot });
  tryWrapPane(split, pane);
  ensureRegistered(pane);
  if (options?.essentials) {
    try { pane.registerPlugin(Essentials); } catch {}
  }
  return pane;
}

function mountSplitButtonRow(
  pane: Pane,
  args: {
    sizes: number[] | string;
    labels: string[];
    gutter?: number;
  },
) {
  const split = toSplitApi(pane.addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: args.sizes,
    gutter: args.gutter ?? 4,
    children: args.labels.map(() => 'leaf'),
  }));

  split.getSlots().forEach((slot: HTMLElement, i: number) => {
    const childPane = createChildPane(split, slot);
    childPane.addBlade({
      view: 'sized-button',
      title: args.labels[i],
      units: 2,
    });
  });
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

function createRafScheduler(task: () => void) {
  let rafId = 0;

  const run = () => {
    if (rafId !== 0) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      task();
    });
  };

  const dispose = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  return { run, dispose };
}

function observeElementResize(target: HTMLElement, onResize: () => void) {
  let rafId = 0;
  const schedule = () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      onResize();
    });
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      schedule();
    });
    ro.observe(target);
  }

  window.addEventListener('resize', schedule);
  schedule();

  return () => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    ro?.disconnect();
    window.removeEventListener('resize', schedule);
  };
}

// (sparkline demo removed)

function main() {
  // Basics 1/3 — First Split
  const hostA = document.getElementById('host-a') as HTMLElement | null;
  if (hostA) {
    const paneA = new Pane({ container: hostA, title: 'Basics 1/3 — First Split' });
    ensureRegistered(paneA);
    try { paneA.registerPlugin(Essentials); } catch {}

    const row = toSplitApi(paneA.addBlade({
      view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
      children: ['leaf', 'leaf']
    }));
    const [L, R] = row.getSlots();
    const pL = new Pane({ container: L });
    ensureRegistered(pL);
    pL.addBlade({ view: 'sized-button', title: 'button (3u)', units: 3 });
    const text = document.createElement('div');
    text.style.padding = '8px';
    text.style.color = '#888';
    text.style.fontSize = '10px';
    text.style.lineHeight = '1.5';
    text.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    text.innerHTML = 'Left: button (3u)<br>Right: Custom DOM with controllable height (3u)';
    R.appendChild(text);
  }

  // Basics 2/3 — Size Expressions
  const hostB = document.getElementById('host-b') as HTMLElement | null;
  if (hostB) {
    const paneB = new Pane({ container: hostB, title: 'Basics 2/3 — Size Expressions' });
    ensureRegistered(paneB);
    try { paneB.registerPlugin(Essentials); } catch {}

    mountSplitButtonRow(paneB, {
      sizes: 'equal',
      labels: ['Equal 1', 'Equal 2', 'Equal 3'],
    });
    mountSplitButtonRow(paneB, {
      sizes: '2fr 1fr',
      labels: ['2fr', '1fr'],
    });
    mountSplitButtonRow(paneB, {
      sizes: '20% 80%',
      labels: ['20%', '80%'],
    });
    mountSplitButtonRow(paneB, {
      sizes: '1fr 2fr 2fr',
      labels: ['1fr', '2fr', '2fr'],
    });
  }

  // Basics 3/3 — Mixed DOM
  const hostC = document.getElementById('host-c') as HTMLElement | null;
  if (hostC) {
    const paneC = new Pane({ container: hostC, title: 'Basics 3/3 — Mixed DOM' });
    ensureRegistered(paneC);
    try { paneC.registerPlugin(Essentials); } catch {}

    // Donut gauge + controls
    const rG = toSplitApi(paneC.addBlade({ view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6, interactive: true, children: ['leaf', 'leaf'] }));
    const [gL, gR] = rG.getSlots();
    const gaugeState = { value: 64, thickness: 10, rounded: true, color: '#22d3ee' };
    let leftPaneForGauge: Pane | null = null;
    if (gL) {
      leftPaneForGauge = new Pane({ container: gL });
      tryWrapPane(rG, leftPaneForGauge);
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
      if (gaugeBox) renderDonutGaugeSvg(gaugeBox, gaugeState.value, {
        color: gaugeState.color, thickness: gaugeState.thickness, rounded: gaugeState.rounded,
      });
    };
    const gaugeRender = createRafScheduler(renderGauge);
    let disposeGaugeResize = () => {};
    if (gaugeBox) {
      disposeGaugeResize = observeElementResize(gaugeBox, gaugeRender.run);
    }
    gaugeRender.run();
    try { leftPaneForGauge?.on('change', gaugeRender.run); } catch {}
    window.addEventListener('beforeunload', () => {
      disposeGaugeResize();
      gaugeRender.dispose();
    }, { once: true });
  }

  // Section 2: Button extensions
  const host2 = document.getElementById('host-compact') as HTMLElement | null;
  if (host2) {
    const pane2 = new Pane({ container: host2, title: 'Button Extensions' });
    ensureRegistered(pane2);
    try { pane2.registerPlugin(Essentials); } catch {}

    const state = { compact: true, armed: false, monitoring: false, a: 50, b: 24 };

    const buttonRow = toSplitApi(pane2.addBlade({
      view: 'split-layout',
      direction: 'row',
      sizes: '1fr 1fr',
      children: ['leaf', 'leaf'],
    }));
    const [toggleSlot, armedSlot] = buttonRow.getSlots();
    if (toggleSlot) {
      const togglePane = createChildPane(buttonRow, toggleSlot);
      const toggleApi = togglePane.addBinding(state, 'compact', {
        view: 'boolean-button',
        units: 2,
        content: {
          text: 'Compact Sliders\nOff',
          icon: ICONS.sliders,
        },
        contentOn: {
          text: 'Compact Sliders\nOn',
        },
      });
      toggleApi.on('change', () => {
        requestAnimationFrame(renderPreview);
      });
    }
    if (armedSlot) {
      const armedPane = createChildPane(buttonRow, armedSlot);
      armedPane.addBinding(state, 'armed', {
        view: 'boolean-button',
        units: 2,
        content: {
          text: 'Armed',
          icon: ICONS.power,
        },
        contentOn: {
          text: 'Armed',
        },
      });
    }

    const fullRow = toSplitApi(pane2.addBlade({
      view: 'split-layout',
      direction: 'row',
      children: ['leaf'],
    }));
    const [fullRowSlot] = fullRow.getSlots();
    if (fullRowSlot) {
      const fullRowPane = createChildPane(fullRow, fullRowSlot);
      fullRowPane.addBinding(state, 'monitoring', {
        view: 'boolean-button',
        units: 3,
        content: {
          text: 'Monitor\nGraph',
          icon: ICONS.graph,
        },
        contentOn: {
          text: 'Monitoring\nGraph',
        },
      });
    }

    pane2.addButton({ title: 'Native Full-Width Button' });

    let previewApi: SplitApi | null = null;
    let previewPanes: Pane[] = [];

    const clearPreview = () => {
      previewPanes.forEach((p) => { try { p.dispose(); } catch {} });
      previewPanes = [];
      if (previewApi) {
        try { (pane2 as unknown as { remove: (api: object) => void }).remove(previewApi as unknown as object); } catch {}
        previewApi = null;
      }
    };

    function renderPreview() {
      clearPreview();
      const api = toSplitApi(pane2.addBlade({
        view: 'split-layout',
        direction: 'row',
        sizes: '1fr 1fr',
        compactSliders: state.compact,
        children: ['leaf', 'leaf']
      }));
      previewApi = api;
      const [L, R] = api.getSlots();
      const pl = createChildPane(api, L, { essentials: true });
      const pr = createChildPane(api, R, { essentials: true });
      pl.addBinding(state, 'a', { min: 0, max: 100, label: 'Left Value' });
      pr.addBinding(state, 'b', { min: 0, max: 100, label: 'Right Value' });
      previewPanes.push(pl, pr);
    }

    renderPreview();
  }

  // Section 3: Custom categories (dense, equal occupancy per column)
  const host3 = document.getElementById('host-cats') as HTMLElement | null;
  if (host3) {
    const pane3 = new Pane({ container: host3, title: 'Semantic Leaves' });
    ensureRegistered(pane3);
    try { pane3.registerPlugin(Essentials); } catch {}

    // Row C1: 66 / 34 — fill with controls
    const c1 = toSplitApi(pane3.addBlade({ view: 'split-layout', direction: 'row', sizes: [66, 33], children: ['alpha', 'beta'] }));

    // Row C2: equal — three columns, fill each with two controls
    const c2 = toSplitApi(pane3.addBlade({ view: 'split-layout', direction: 'row', sizes: 'equal', children: ['alpha', 'beta', 'gamma'] }));

    // Row C3: 1fr 2fr — left side is a nested adaptive column
    const c3 = toSplitApi(pane3.addBlade({
      view: 'split-layout',
      direction: 'row',
      sizes: '1fr 2fr',
      children: [
        {
          view: 'split-layout',
          direction: 'column',
          compactSliders: false,
          children: ['alpha', 'alpha', 'alpha']
        },
        'gamma'
      ]
    }));

    // Fill on the next frame to avoid any initial measurement race
    requestAnimationFrame(() => {
      // C1 fill
      {
        const [l, r] = c1.getSlots();
        if (l) { const p = new Pane({ container: l }); tryWrapPane(c1, p); ensureRegistered(p); p.addBlade({ view: 'sized-button', title: 'Run\nAction', units: 3 }); }
        if (r) {
          const p = new Pane({ container: r }); tryWrapPane(c1, p); ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ v: 42 }, 'v', { min: 0, max: 100, label: 'Level' });
          p.addBinding({ on: true }, 'on', { label: 'Enabled' });
          p.addBinding({ mode: 'a' }, 'mode', { options: { Alpha: 'a', Beta: 'b', Gamma: 'g' } });
        }
      }

      // C2 fill (two controls per column, no labels to keep compact)
      {
        const [a, b, g] = c2.getSlots();
        if (a) { const p = new Pane({ container: a }); tryWrapPane(c2, p); ensureRegistered(p); p.addButton({ title: 'Action' }); p.addBinding({ text: 'hello' }, 'text'); }
        if (b) { const p = new Pane({ container: b }); tryWrapPane(c2, p); ensureRegistered(p); p.addBinding({ n: 3.14 }, 'n', { min: 0, max: 10 }); p.addBinding({ c: '#22d3ee' }, 'c'); }
        if (g) { const p = new Pane({ container: g }); tryWrapPane(c2, p); ensureRegistered(p); try { p.registerPlugin(Essentials); } catch {} p.addBlade({ view: 'buttongrid', size: [2, 2], cells: (x: number, y: number) => ({ title: String.fromCharCode('A'.charCodeAt(0) + (y * 2 + x)) }) }); }
      }

      // C3 fill (three per side)
      {
        const leftSlots = c3.getSlotsByCategory?.('alpha') ?? [];
        const rightSlots = c3.getSlotsByCategory?.('gamma') ?? [];

        // Fill left side (non-compact)
        if (leftSlots[0]) {
          const p = new Pane({ container: leftSlots[0] });
          ensureRegistered(p);
          p.addBinding({ p: { x: 0.3, y: 0.7 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, label: '' });
        }
        if (leftSlots[1]) {
          const p = new Pane({ container: leftSlots[1] });
          ensureRegistered(p);
          try { p.registerPlugin(Essentials); } catch {}
          // Collapsed folder with three elements
          const folder = (p as unknown as PaneWithFolder).addFolder?.({ title: 'Details', expanded: false });
          folder?.addBinding({ level: 0.5 } as Record<string, unknown>, 'level', { min: 0, max: 1, label: 'Level' });
          folder?.addBinding({ mode: 'A' } as Record<string, unknown>, 'mode', { options: { A: 'A', B: 'B', C: 'C' }, label: 'Mode' });
          folder?.addButton?.({ title: 'Apply' });
        }
        if (leftSlots[2]) {
          const p = new Pane({ container: leftSlots[2] });
          ensureRegistered(p);
          p.addBinding({ volume: 50 }, 'volume', { min: 0, max: 100, label: 'Volume' });
          p.addBinding({ txt: 'note' }, 'txt', { label: '' });
        }

        // Fill right side (compact)
        if (rightSlots[0]) {
          const p = new Pane({ container: rightSlots[0] });
          tryWrapPane(c3, p);
          ensureRegistered(p);
          try { p.registerPlugin(Essentials); } catch {}
          p.addBinding({ p: { x: 0.1, y: 0.5, z: 0.9 } }, 'p', { x: { min: 0, max: 1 }, y: { min: 0, max: 1 }, z: { min: 0, max: 1 } });
          p.addBlade({ view: 'cubicbezier', value: [0.5, 0.2, 0.5, 1] });

          // Replace fpsgraph with a sub-split
          const subSplit = toSplitApi(p.addBlade({
            view: 'split-layout',
            direction: 'row',
            sizes: '80px 1fr',
            children: ['left', 'right']
          }));

          const [btnSlot, graphSlot] = subSplit.getSlots();

          // Left: 2-unit high button
          if (btnSlot) {
            const btnPane = new Pane({ container: btnSlot });
            tryWrapPane(c3, btnPane);
            ensureRegistered(btnPane);
            btnPane.addBlade({ view: 'sized-button', title: 'Monitor\nGraph', units: 2 });
          }

          // Right: graph blade (native tweakpane)
          if (graphSlot) {
            const graphPane = new Pane({ container: graphSlot });
            tryWrapPane(c3, graphPane);
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

            // Simple cleanup on page unload
            window.addEventListener('beforeunload', () => clearInterval(interval), { once: true });
          }
        }
      }
    });
  }
}

main();

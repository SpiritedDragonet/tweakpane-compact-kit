import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { SplitLayoutPlugin } from './plugins/SplitLayoutPlugin';
import { installBladeViewShims } from './plugins/tpBladePlugins';
import { addSizedButton } from './plugins/addSizedButton';

// Minimal app for SplitLayoutPlugin development
// - Removes unrelated states and features
// - Mounts a Tweakpane and demonstrates the split-layout blade

export const App: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const pane = new Pane({ container, title: 'Split Layout Demo' });
    try { pane.registerPlugin(EssentialsPlugin as any); } catch {}
    try { pane.registerPlugin(SplitLayoutPlugin as any); } catch {}
    // Place the Random button above the Demo folder
    const btn = pane.addButton({ title: '随机' });
    const folder = pane.addFolder({ title: 'Demo', expanded: true });
    const uninstall = installBladeViewShims(folder as any);
    // Build spec: first split into equal columns (1..4), then for each column
    // split into 1..4 rows (equal), with a computed fixed height for clarity.
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    type LeafKind = 'button'|'sizedbutton'|'number'|'slider'|'range'|'dropdown'|'checkbox'|'color'|'point2d'|'text'|'buttongrid'|'folder'|'customDom';
    type LeafPlan = { kind: LeafKind; folderChildren?: number; customUnits?: number; sizedUnits?: number };
    type ColPlan = { rows: number; leaves: LeafPlan[]; rowUnits: number[] };
    type LayoutPlan = { colCount: number; cols: ColPlan[] };

    const chooseLeaf = (): LeafPlan => {
      const kinds: LeafKind[] = ['button','sizedbutton','number','slider','range','dropdown','checkbox','color','point2d','text','buttongrid','folder','customDom'];
      const k = kinds[randomInt(0, kinds.length - 1)];
      if (k === 'folder') return { kind: 'folder', folderChildren: randomInt(2, 5) };
      if (k === 'customDom') return { kind: 'customDom', customUnits: randomInt(1, 4) };
      if (k === 'sizedbutton') return { kind: 'sizedbutton', sizedUnits: randomInt(2, 4) };
      return { kind: k };
    };

    const estimateUnits = (leaf: LeafPlan): number => {
      switch (leaf.kind) {
        case 'folder': return Math.max(2, (leaf.folderChildren ?? 2) + 1);
        case 'customDom': return Math.max(1, leaf.customUnits ?? 1);
        case 'sizedbutton': return Math.max(2, leaf.sizedUnits ?? 2);
        case 'range': return 2;
        case 'point2d': return 2;
        case 'buttongrid': return 2;
        default: return 1; // button, number, slider, dropdown, checkbox, color, text
      }
    };

    const buildPlan = (): LayoutPlan => {
      const colCount = randomInt(1, 4);
      const cols: ColPlan[] = [];
      for (let c = 0; c < colCount; c++) {
        const rows = randomInt(1, 4);
        const leaves: LeafPlan[] = [];
        const rowUnits: number[] = [];
        for (let r = 0; r < rows; r++) {
          const leaf = chooseLeaf();
          leaves.push(leaf);
          rowUnits.push(estimateUnits(leaf));
        }
        cols.push({ rows, leaves, rowUnits });
      }
      return { colCount, cols };
    };

    const buildSpecFromPlan = (plan: LayoutPlan): any => {
      const colSizes = Array.from({ length: plan.colCount }, () => 100 / plan.colCount);
      const children = plan.cols.map((col) => ({
        view: 'split-layout',
        direction: 'column',
        rowUnits: col.rowUnits.slice(),
        children: Array.from({ length: col.rows }, () => 'leaf'),
        // Keep gutter consistent with plugin (4px)
        gutter: 4,
        interactive: false,
      }));
      return {
        view: 'split-layout',
        direction: 'row',
        sizes: colSizes,
        children,
        // Keep gutter consistent with plugin (4px)
        gutter: 4,
        interactive: false,
      };
    };

    let splitApi: any | null = null;
    const childPanes: Pane[] = [];
    const sliderObserverCleanups: Array<() => void> = [];
    const installSliderLabelObserver = (rootEl: HTMLElement): (() => void) => {
      // Patch a labeled view if it contains a slider-like value area
      const patchOne = (lv: HTMLElement) => {
        try {
          if (!lv.classList?.contains('tp-lblv')) return;
          const valueBox = lv.querySelector('.tp-lblv_v') as HTMLElement | null;
          const labelBox = lv.querySelector('.tp-lblv_l') as HTMLElement | null;
          if (!valueBox) return;
          // Heuristic: treat as slider if valueBox contains an element whose class includes 'sld'
          const isSlider = !!valueBox.querySelector('[class*="sld"]');
          if (!isSlider) return;
          (valueBox.style as any).marginLeft = '0';
          (valueBox.style as any).position = (valueBox.style.position && valueBox.style.position !== 'static') ? valueBox.style.position : 'relative';
          // Make value container follow the full leaf width
          valueBox.style.width = '100%';
          valueBox.style.maxWidth = '100%';
          valueBox.style.boxSizing = 'border-box';
          (lv.style as any).width = '100%';
          (lv.style as any).maxWidth = '100%';
          (lv.style as any).boxSizing = 'border-box';
          (lv.style as any).position = (lv.style.position && lv.style.position !== 'static') ? lv.style.position : 'relative';
          if (labelBox) {
            labelBox.style.display = 'block';
            labelBox.style.position = 'absolute';
            labelBox.style.left = '6px';
            labelBox.style.top = '4px';
            labelBox.style.fontSize = '10px';
            labelBox.style.lineHeight = '1';
            labelBox.style.color = '#aaa';
            labelBox.style.margin = '0';
            labelBox.style.padding = '0';
            try { valueBox.insertBefore(labelBox, valueBox.firstChild); } catch {}
          }
          // Flatten the slider a bit to make room visually
          // Only vertically scale slider's inner surface without changing blade height
          const sldSurface = (valueBox.querySelector('.tp-sldtxtv_s') as HTMLElement | null)
            || (valueBox.querySelector('.tp-sldv_s') as HTMLElement | null);
          if (sldSurface) {
            // Keep the slider visually anchored to the bottom; shrink height by 50%
            sldSurface.style.transformOrigin = 'bottom left';
            sldSurface.style.transform = 'scaleY(0.5)';
            (sldSurface.style as any).willChange = 'transform';
            // Hide a potential draggable handle/knob within the slider surface
            const handle = (sldSurface.querySelector('.tp-sldv_h')
              || sldSurface.querySelector('[class*="sldv_h"]')
              || sldSurface.querySelector('[class*="knob"]')
              || sldSurface.querySelector('[class*="handle"]')
              || sldSurface.querySelector('[class*="thumb"]')) as HTMLElement | null;
            if (handle) {
              handle.style.display = 'none';
            }
          }
          // Place the entire text area (.tp-sldtxtv_t) at the top-right, unscaled by slider surface
          const sldTextArea = valueBox.querySelector('.tp-sldtxtv_t') as HTMLElement | null;
          if (sldTextArea) {
            // Ensure value container is positioning root (already set above), then mount here
            try { valueBox.appendChild(sldTextArea); } catch {}
            sldTextArea.style.position = 'absolute';
            sldTextArea.style.right = '6px';
            sldTextArea.style.top = '2px';
            sldTextArea.style.transformOrigin = 'top right';
            sldTextArea.style.transform = 'scale(0.3333, 0.5)';
            (sldTextArea.style as any).willChange = 'transform';
            sldTextArea.style.zIndex = '1';
            // Enlarge numeric text for readability (pre-scale), and bold
            const inputEl = sldTextArea.querySelector('input') as HTMLElement | null;
            if (inputEl) {
              // Pre-scale font so post-scale ~12px (scaleY=0.5)
              inputEl.style.fontSize = '24px';
              inputEl.style.fontWeight = '';
              inputEl.style.lineHeight = '1';
              // Use Tweakpane default font (inherit)
              inputEl.style.fontFamily = '';
              inputEl.style.letterSpacing = '0.01em';
            }
          }
        } catch {}
      };
      const scanAll = (node?: HTMLElement) => {
        const scope = node || rootEl;
        try {
          const list = scope.querySelectorAll('.tp-lblv');
          list.forEach((lv) => patchOne(lv as HTMLElement));
        } catch {}
      };
      scanAll();
      const mo = new MutationObserver((mut) => {
        mut.forEach((m) => {
          m.addedNodes.forEach((n) => {
            const el = (n as any) as HTMLElement;
            if (!el || el.nodeType !== 1) return;
            if (el.classList?.contains('tp-lblv')) patchOne(el);
            // also scan descendants that might include labeled views
            try { scanAll(el); } catch {}
          });
        });
      });
      try { mo.observe(rootEl, { childList: true, subtree: true }); } catch {}
      return () => { try { mo.disconnect(); } catch {} };
    };
    const computeUnitPx = (anchor: HTMLElement): number => {
      // Try to read Tweakpane's --cnt-usz from the closest container to avoid scope issues
      const doc = anchor.ownerDocument || document;
      const findContainer = (el: HTMLElement | null): HTMLElement | null => {
        let cur: HTMLElement | null = el;
        while (cur) {
          if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) return cur;
          cur = cur.parentElement;
        }
        return el;
      };
      const cont = findContainer(anchor) || anchor;
      try {
        const cs = (cont.ownerDocument?.defaultView || window).getComputedStyle(cont);
        const v = cs.getPropertyValue('--cnt-usz')?.trim();
        if (v) {
          const m = v.match(/([0-9]+\.?[0-9]*)\s*px/i);
          if (m) return Math.max(1, Math.round(parseFloat(m[1])));
          const f = parseFloat(v);
          if (Number.isFinite(f) && f > 0) return Math.round(f);
        }
      } catch {}
      // Probe fallback using the found container (ensures var resolution if defined upstream)
      try {
        const probe = doc.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.height = 'var(--cnt-usz)';
        probe.style.width = '1px';
        (cont || anchor).appendChild(probe);
        const px = probe.getBoundingClientRect().height || (probe as any).offsetHeight || 0;
        probe.remove();
        if (px) return Math.max(1, Math.round(px));
      } catch {}
      // Final conservative fallback
      return 28; // typical TP default height
    };
    const createDropdown = (p: Pane) => {
      const pool = ['A', 'B', 'C', 'D'];
      const count = randomInt(2, 4);
      const sel = pool.slice(0).sort(() => Math.random() - 0.5).slice(0, count);
      const opts = sel.map((t) => ({ text: t, value: t.toLowerCase() }));
      (p as any).addBlade?.({ view: 'list', options: opts, value: opts[0]?.value ?? 'a' });
    };
    const tweakSliderLabel = (bindingApi: any, label: string) => {
      try {
        const rootEl: HTMLElement | undefined = (bindingApi?.controller?.view?.element) as HTMLElement | undefined;
        if (!rootEl) return;
        // Root should not reserve left label space
        const valueBox = rootEl.querySelector('.tp-lblv_v') as HTMLElement | null;
        const labelBox = rootEl.querySelector('.tp-lblv_l') as HTMLElement | null;
        if (!valueBox) return;
        (valueBox.style as any).marginLeft = '0';
        valueBox.style.position = 'relative';
        (rootEl.style as any).position = 'relative';
        if (!label || !label.trim()) {
          // No label: remove the label box if present
          if (labelBox && labelBox.parentElement) labelBox.parentElement.removeChild(labelBox);
          return;
        }
        if (labelBox) {
          // Move label into value area and shrink font
          labelBox.textContent = label;
          labelBox.style.display = 'block';
          labelBox.style.position = 'absolute';
          labelBox.style.left = '6px';
          labelBox.style.top = '4px';
          labelBox.style.fontSize = '10px';
          labelBox.style.lineHeight = '1';
          labelBox.style.color = '#aaa';
          labelBox.style.margin = '0';
          labelBox.style.padding = '0';
          // Limit width to 70% and truncate with ellipsis
          labelBox.style.maxWidth = '70%';
          labelBox.style.overflow = 'hidden';
          labelBox.style.textOverflow = 'ellipsis';
          labelBox.style.whiteSpace = 'nowrap';
          // Make background transparent and place behind slider
          labelBox.style.paddingRight = '4px';
          labelBox.style.background = 'transparent';
          labelBox.style.zIndex = '1';
          // Ensure slider handle is above label
          const sliderHandle = labelBox.closest('.tp-lblv')?.querySelector('.tp-txtv_k') as HTMLElement;
          if (sliderHandle) {
            sliderHandle.style.zIndex = '2';
            sliderHandle.style.position = 'relative';
          }
          try { valueBox.insertBefore(labelBox, valueBox.firstChild); } catch {}
        }
      } catch {}
    };
    const removeLabelFor = (bindingApi: any) => {
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
    };
    const fillSlotsWithPlan = (apiObj: any, plan: LayoutPlan) => {
      const slots: HTMLElement[] = apiObj?.getSlots?.() ?? [];
      let idx = 0;
      for (let c = 0; c < plan.cols.length; c++) {
        const col = plan.cols[c];
        for (let r = 0; r < col.rows; r++) {
          const slot = slots[idx++];
          if (!slot) continue;
          const leaf = col.leaves[r];
          if (leaf.kind === 'customDom') {
            const n = Math.max(1, leaf.customUnits ?? 1);
            const box = slot.ownerDocument.createElement('div');
            box.classList.add('tp-demo-domleaf');
            box.style.width = '100%';
            // Use CSS variable to keep exact parity with Tweakpane unit size
            box.style.height = `calc(var(--cnt-usz) * ${n})`;
            box.style.boxSizing = 'border-box';
            box.style.display = 'flex';
            box.style.alignItems = 'center';
            box.style.justifyContent = 'center';
            box.style.border = '1px dashed #444';
            box.style.background = 'rgba(255,255,255,0.06)';
            box.textContent = `DOM(${n}u)`;
            slot.appendChild(box);
          } else {
            const p = new Pane({ container: slot });
            // Ensure child panes know about essentials blades (e.g., buttongrid)
            try { p.registerPlugin(EssentialsPlugin as any); } catch {}
            // Reduce default vertical paddings/margins inside this leaf to avoid extra blank space
            try {
              p.registerPlugin({
                id: 'leaf-layout-fix',
                css: `
                  /* Hide Tweakpane title bar and spacing elements to eliminate vertical gaps */
                  .tp-split-leaf .tp-rotv_b {
                    display: none !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .tp-split-leaf .tp-rotv_i {
                    display: none !important;
                    height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }

                  /* Make all containers shrink to content height */
                  .tp-split-leaf.tp-split-leaf.tp-split-leaf {
                    height: auto !important;
                  }
                  .tp-split-root-column > .tp-split-panel.tp-split-panel {
                    flex: 0 0 auto !important;
                  }
                  .tp-split-leaf .tp-rotv.tp-rotv.tp-rotv {
                    height: auto !important;
                    border-radius: 0 !important;
                    border-top-left-radius: 0 !important;
                    border-top-right-radius: 0 !important;
                    border-bottom-left-radius: 0 !important;
                    border-bottom-right-radius: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .tp-split-leaf .tp-rotv_c.tp-rotv_c.tp-rotv_c {
                    flex: 0 0 auto !important;
                    height: auto !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    gap: 0 !important;
                  }

                  /* Remove bottom margins/paddings to eliminate gaps */
                  .tp-split-leaf .tp-lblv, .tp-split-leaf .tp-lblv_v { margin-bottom: 0 !important; }
                  .tp-split-leaf .tp-v-fst, .tp-split-leaf .tp-v-vfst, .tp-split-leaf .tp-v-lst, .tp-split-leaf .tp-v-vlst {
                    padding-bottom: 0 !important;
                    margin-bottom: 0 !important;
                  }
                  .tp-split-leaf .tp-rotv_c > * { margin-bottom: 0 !important; }

                  /* Fix all control layouts - prevent value containers from overflowing parent */
                  .tp-split-leaf .tp-lblv {
                    /* Ensure labeled view container respects leaf width */
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                  }
                  /* Exception for sliders - keep custom width handling */
                  .tp-split-leaf .tp-lblv:has(.tp-sldv),
                  .tp-split-leaf .tp-lblv:has(.tp-sldtxtv) {
                    /* Sliders use absolute positioning, keep custom styles */
                  }
                  .tp-split-leaf .tp-lblv_v {
                    /* Allow value container to shrink instead of fixed width */
                    width: auto !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                    flex-shrink: 1 !important;
                    box-sizing: border-box !important;
                  }
                  /* Exception for slider value containers */
                  .tp-split-leaf .tp-lblv:has(.tp-sldv) .tp-lblv_v,
                  .tp-split-leaf .tp-lblv:has(.tp-sldtxtv) .tp-lblv_v {
                    width: 100% !important;
                    max-width: 100% !important;
                  }
                  .tp-split-leaf .tp-lblv_l {
                    /* Ensure label has space and doesn't get crushed to 0 */
                    flex-basis: 30% !important;
                    min-width: 0 !important;
                    width: auto !important;
                    box-sizing: border-box !important;
                  }
                  /* Make specific controls respect container width */
                  .tp-split-leaf .tp-colv,
                  .tp-split-leaf .tp-txtv,
                  .tp-split-leaf .tp-p2dv {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                  }
                  .tp-split-leaf .tp-ckbv {
                    padding-left: 0 !important;
                  }
                  .tp-split-leaf .tp-ckbv_l {
                    padding-right: 8px !important;
                    margin-right: 0 !important;
                  }

                  /* Folder specific adjustments */
                  .tp-split-leaf .tp-fldv {
                    padding-bottom: 0 !important;
                    margin-bottom: 0 !important;
                  }
                  .tp-split-leaf .tp-fldv_c { padding-bottom: 0 !important; }
                  .tp-split-leaf .tp-fldv_c > * { margin-bottom: 0 !important; }
                `,
              } as any);
            } catch {}
            childPanes.push(p);
            // NOTE: Do not force inner pane to 100% height here.
            // Keeping natural height allows accurate unit measurement.
            // Spacing cleanup above already removes most extra gaps.
            try {
              const rootEl = (p as any).element as HTMLElement;
              if (rootEl) {
                rootEl.style.boxSizing = 'border-box';
              }
            } catch {}
            // Observer to keep slider labels styled consistently inside this leaf
            try { sliderObserverCleanups.push(installSliderLabelObserver(p.element)); } catch {}
            if (leaf.kind === 'button') {
              p.addButton({ title: '按钮' });
            } else if (leaf.kind === 'sizedbutton') {
              addSizedButton(p, { title: '多行按钮', units: Math.max(2, leaf.sizedUnits ?? 2) });
            } else if (leaf.kind === 'number') {
              const o = { n: randomInt(-50, 50) } as { n: number };
              const api = p.addBinding(o, 'n', { min: -100, max: 100, step: 1 });
              removeLabelFor(api);
            } else if (leaf.kind === 'slider') {
              const o = { v: Math.random() } as { v: number };
              const sliderLabel = 'VeryLongSliderLabelText';
              const api = p.addBinding(o, 'v', { min: 0, max: 1, step: 0.01, label: sliderLabel } as any);
              // Apply style immediately and on next tick to cover async layout
              tweakSliderLabel(api, sliderLabel);
              setTimeout(() => tweakSliderLabel(api, sliderLabel), 0);
            } else if (leaf.kind === 'range') {
              const o = { lo: randomInt(0, 40), hi: randomInt(60, 100) } as { lo: number; hi: number };
              const api1 = p.addBinding(o, 'lo', { min: 0, max: 100, step: 1 });
              const api2 = p.addBinding(o, 'hi', { min: 0, max: 100, step: 1 });
              removeLabelFor(api1);
              removeLabelFor(api2);
            } else if (leaf.kind === 'dropdown') {
              createDropdown(p);
            } else if (leaf.kind === 'checkbox') {
              const o = { b: Math.random() < 0.5 } as { b: boolean };
              p.addBinding(o, 'b', { label: '选项' } as any);
            } else if (leaf.kind === 'color') {
              const o = { c: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') } as { c: string };
              try {
                const api = p.addBinding(o, 'c');
                removeLabelFor(api);
              } catch {}
            } else if (leaf.kind === 'point2d') {
              const o = { x: randomInt(-10, 10), y: randomInt(-10, 10) } as { x: number; y: number };
              const ax = p.addBinding(o, 'x', { min: -100, max: 100, step: 1 });
              const ay = p.addBinding(o, 'y', { min: -100, max: 100, step: 1 });
              removeLabelFor(ax);
              removeLabelFor(ay);
            } else if (leaf.kind === 'text') {
              const o = { s: `文本${randomInt(1, 99)}` } as { s: string };
              const api = p.addBinding(o, 's');
              removeLabelFor(api);
            } else if (leaf.kind === 'buttongrid') {
              const cols = randomInt(2, 3);
              const rows = randomInt(1, 2);
              try {
                (p as any).addBlade?.({ view: 'buttongrid', size: [cols, rows], cells: (x: number, y: number) => ({ title: `B${y + 1}-${x + 1}` }) });
              } catch {
                // Fallback: show a regular button if essentials not available for some reason
                p.addButton({ title: '按钮' });
              }
            } else if (leaf.kind === 'folder') {
              const f = p.addFolder({ title: '分组', expanded: true });
              const n = Math.max(2, leaf.folderChildren ?? 2);
              for (let i = 0; i < n; i++) {
                const o = { v: Math.random() } as { v: number };
                (f as any).addBinding?.(o, 'v', { min: 0, max: 1, step: 0.01 });
              }
            }
          }
        }
      }
    };

    const measureUnitsFromSlots = (apiObj: any, plan: LayoutPlan): LayoutPlan => {
      const slots: HTMLElement[] = apiObj?.getSlots?.() ?? [];
      let idx = 0;
      const next: LayoutPlan = { colCount: plan.colCount, cols: plan.cols.map(col => ({ rows: col.rows, leaves: col.leaves.slice(), rowUnits: col.rowUnits.slice() })) };
      // Helper: pick an intrinsic element inside a slot to measure natural height
      const pickIntrinsic = (slot: HTMLElement): HTMLElement | null => {
        // prefer folder content, then pane content, then pane root, then first child
        const fld = slot.querySelector('.tp-fldv_c') as HTMLElement | null;
        if (fld) return fld;
        const rotc = slot.querySelector('.tp-rotv_c') as HTMLElement | null;
        if (rotc) return rotc;
        const rot = slot.querySelector('.tp-rotv') as HTMLElement | null;
        if (rot) return rot;
        const first = slot.firstElementChild as HTMLElement | null;
        return first;
      };
      for (let c = 0; c < next.cols.length; c++) {
        const col = next.cols[c];
        for (let r = 0; r < col.rows; r++) {
          const slot = slots[idx++];
          if (!slot) continue;
          const el = pickIntrinsic(slot);
          if (!el) continue;
          const unitPx = computeUnitPx(slot);
          let h = 0;
          // If inside a folder, include header + content heights
          const fld = slot.querySelector('.tp-fldv') as HTMLElement | null;
          if (fld) {
            const hdr = fld.querySelector('.tp-fldv_b') as HTMLElement | null;
            const cnt = fld.querySelector('.tp-fldv_c') as HTMLElement | null;
            const relax = (t: HTMLElement | null): number => {
              if (!t) return 0;
              const ph = t.style.height;
              const pf = t.style.flex as string;
              try { t.style.height = 'auto'; t.style.flex = '0 0 auto'; } catch {}
              const sh = (t as any).scrollHeight || 0;
              const rh = t.getBoundingClientRect().height || 0;
              const hh = Math.max(sh, rh);
              try { t.style.height = ph; t.style.flex = pf; } catch {}
              return hh;
            };
            h = relax(hdr) + relax(cnt);
          } else {
            // Temporarily relax explicit heights/flex to measure natural content
            const prevH = el.style.height;
            const prevFlex = el.style.flex;
            const hasExplicitH = !!(prevH && prevH !== 'auto');
            const isDomLeaf = el.classList?.contains('tp-demo-domleaf');
            if (!hasExplicitH && !isDomLeaf) {
              try { el.style.height = 'auto'; el.style.flex = '0 0 auto'; } catch {}
            }
            const scrH = (el as any).scrollHeight || 0;
            const rectH = el.getBoundingClientRect().height || 0;
            h = Math.max(scrH, rectH);
            if (!hasExplicitH && !isDomLeaf) {
              try { el.style.height = prevH; el.style.flex = prevFlex; } catch {}
            }
          }
          const units = Math.max(1, Math.ceil(h / unitPx));
          col.rowUnits[r] = units;
        }
      }
      return next;
    };
    const mountSpec = () => {
      try { childPanes.splice(0).forEach((cp) => cp.dispose()); } catch {}
      try { splitApi?.dispose?.(); } catch {}
      const plan1 = buildPlan();
      splitApi = (folder as any).addBlade(buildSpecFromPlan(plan1));
      try { fillSlotsWithPlan(splitApi, plan1); } catch {}
      // Measure and rebuild once if needed
      const plan2 = measureUnitsFromSlots(splitApi, plan1);
      const changed = JSON.stringify(plan1.cols.map(c=>c.rowUnits)) !== JSON.stringify(plan2.cols.map(c=>c.rowUnits));
      if (changed) {
        try { childPanes.splice(0).forEach((cp) => cp.dispose()); } catch {}
        try { splitApi?.dispose?.(); } catch {}
        splitApi = (folder as any).addBlade(buildSpecFromPlan(plan2));
        try { fillSlotsWithPlan(splitApi, plan2); } catch {}
      }
    };

    // Wire up the top-level button after mountSpec is defined
    btn.on('click', () => mountSpec());

    // initial mount
    mountSpec();

    return () => {
      try { childPanes.splice(0).forEach((cp) => cp.dispose()); } catch {}
      try { sliderObserverCleanups.splice(0).forEach((fn) => fn()); } catch {}
      try { splitApi?.dispose?.(); } catch {}
      try { (btn as any)?.dispose?.(); } catch {}
      try { uninstall?.(); } catch {}
      try { pane.dispose(); } catch {}
    };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%', padding: 12, boxSizing: 'border-box' }}>
      <div style={{ flex: '1 1 auto', border: '1px solid #333', borderRadius: 8, background: '#0a0b0e' }}>
        <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default App;

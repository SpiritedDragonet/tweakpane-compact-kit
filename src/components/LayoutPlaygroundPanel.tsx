import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import type { ButtonGridApi } from '@tweakpane/plugin-essentials';
import { addBladeLayout } from '../plugins/addBladeLayout';
import type { BladeLayoutSpec } from '../plugins/BladeLayout';
import { addSizedButton } from '../plugins/addSizedButton';

type Props = {
  onRun?: () => void;
};

const LayoutPlaygroundPanel: React.FC<Props> = ({ onRun }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const paneRef = useRef<Pane | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const pane = new Pane({ container, title: '布局试验' });
    pane.registerPlugin(EssentialsPlugin as any);
    // Scoped CSS helpers for slots
    try {
      pane.registerPlugin({
        id: 'blade-helpers',
        css: `
          .tp-bl-slot .tp-lblv, .tp-bl-slot .tp-lblv_v { min-width: 0; max-width: 100%; box-sizing: border-box; }
          .tp-bl-slot { padding-top: 4px; padding-bottom: 4px; }
          /* Zero vertical gaps inside slots to eliminate extra spacing */
          .tp-bl-slot .tp-lblv { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-rotv, .tp-bl-slot .tp-rotv_c, .tp-bl-slot .tp-cntv { padding-top: 0 !important; padding-bottom: 0 !important; }
          .tp-bl-slot .tp-rotv_c > * { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-fldv { margin-top: 0 !important; margin-bottom: 0 !important; }
          .tp-bl-slot .tp-fldv_c { padding-top: 0 !important; padding-bottom: 0 !important; }
          .tp-bl-slot .tp-v-fst, .tp-bl-slot .tp-v-vfst, .tp-bl-slot .tp-v-lst, .tp-bl-slot .tp-v-vlst {
            padding-top: 0 !important; padding-bottom: 0 !important;
            margin-top: 0 !important; margin-bottom: 0 !important;
          }
          .tp-bl-row > .tp-bl-cell { overflow: hidden; box-sizing: border-box; }
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) { padding-left: 0; }
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) .tp-lblv_l { display: none; width: 0; margin: 0; padding: 0; }
          .tp-bl-slot .tp-lblv:not(:has(.tp-ckbv)) .tp-lblv_v { margin-left: 0; }
        `,
      } as any);
    } catch {}
    paneRef.current = pane;

    const folder = pane.addFolder({ title: '布局试验（Playground）', expanded: true });

    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const sample = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    const buildRandomSpec = (): BladeLayoutSpec => {
      const mode = sample(['eq2', 'eq3', 'eq4', 'ratio']);
      let split: any;
      const rowsPerCol: number[] = [];
      if (mode === 'ratio') {
        const r = Math.random() * 0.4 + 0.3; // 0.3..0.7
        split = { mode: 'ratio', ratio: Number(r.toFixed(2)) };
        rowsPerCol.push(randomInt(1, 4), randomInt(1, 4));
      } else {
        const n = Number(mode.replace('eq', ''));
        split = { mode: 'equal', count: n };
        for (let i = 0; i < n; i++) rowsPerCol.push(randomInt(1, 4));
      }
      const children = rowsPerCol.map((rc) => ({
        layout: {
          units: rc,
          rows: Array.from({ length: rc }, () => ({ units: 1, cols: { mode: 'equal', count: 1 }, children: ['leaf'] })),
          gutter: { row: { value: 0, unit: 'px' } },
        },
      }));
      const baseUnits = 2;
      return {
        units: baseUnits,
        rows: [{ units: baseUnits, cols: split, children }],
        gutter: { col: { value: 0, unit: 'px' } },
        sizing: { container: 'grow', row: 'grow', snap: 'ceil' },
      } as BladeLayoutSpec;
    };

    let layoutApi: ReturnType<typeof addBladeLayout> | null = null;
    const childPanes: Pane[] = [];
    let currentSpec: BladeLayoutSpec | null = null;

    const pgTop = folder.addBlade({ view: 'buttongrid', size: [3, 1], cells: (x: number) => ({ title: x === 0 ? '随机' : x === 1 ? '刷新' : '运行' }) }) as unknown as ButtonGridApi;
    pgTop.on('click', (ev: any) => {
      const [x] = ev.index as [number, number?];
      if (x === 0) { currentSpec = buildRandomSpec(); rebuild(); }
      else if (x === 1) { rebuild(); }
      else onRun && onRun();
    });

    const createDropdown = (paneInst: Pane) => {
      const pool = ['A', 'B', 'C'];
      const count = randomInt(2, 3);
      const sel = pool.slice(0).sort(() => Math.random() - 0.5).slice(0, count);
      const opts = sel.map((t) => ({ text: t, value: t.toLowerCase() }));
      (paneInst as any).addBlade?.({ view: 'list', options: opts, value: opts[0]?.value ?? 'a' });
    };

    const fillSlot = (slot: HTMLElement) => {
      const p = new Pane({ container: slot });
      childPanes.push(p);
      try {
        const header = p.element.querySelector('.tp-rotv_b') as HTMLElement | null;
        const indent = p.element.querySelector('.tp-rotv_i') as HTMLElement | null;
        if (header) header.style.display = 'none';
        if (indent) indent.style.display = 'none';
      } catch {}
      const t = randomInt(0, 7); // 0:button,1:slider,2:dropdown,3:checkbox,4:folder,5:text,6:number,7:color
      if (t === 0) {
        const units = randomInt(1, 4);
        try { addSizedButton(p, { title: `按钮（${units} 行）`, units }); }
        catch { p.addButton({ title: `按钮 ${randomInt(1, 99)}` }); }
      } else if (t === 1) {
        const obj = { v: Math.random() } as { v: number };
        p.addBinding(obj, 'v', { min: 0, max: 1, step: 0.01 });
      } else if (t === 2) {
        createDropdown(p);
      } else if (t === 3) {
        const obj = { b: Math.random() < 0.5 } as { b: boolean };
        p.addBinding(obj, 'b');
      } else if (t === 5) {
        const o = { s: `文本${randomInt(1, 99)}` } as { s: string };
        p.addBinding(o, 's');
      } else if (t === 6) {
        const o = { n: randomInt(-50, 50) } as { n: number };
        p.addBinding(o, 'n', { min: -100, max: 100, step: 1 });
      } else if (t === 7) {
        const o = { c: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') } as { c: string };
        try { p.addBinding(o, 'c'); } catch {}
      } else {
        const f = p.addFolder({ title: '分组', expanded: Math.random() < 0.5 });
        const n = randomInt(2, 3);
        for (let i = 0; i < n; i++) {
          const subt = randomInt(0, 6);
          if (subt === 0) {
            try { (f as any).addButton?.({ title: `子按钮 ${i + 1}` }); } catch {}
          } else if (subt === 1) {
            const o = { v: Math.random() } as { v: number };
            (f as any).addBinding?.(o, 'v', { min: 0, max: 1 });
          } else if (subt === 2) {
            const o = { b: Math.random() < 0.5 } as { b: boolean };
            (f as any).addBinding?.(o, 'b');
          } else if (subt === 3) {
            createDropdown(f as any);
          } else if (subt === 4) {
            const o = { s: `子文本${i+1}` } as { s: string };
            (f as any).addBinding?.(o, 's');
          } else if (subt === 5) {
            const o = { n: randomInt(0, 100) } as { n: number };
            (f as any).addBinding?.(o, 'n', { min: 0, max: 100, step: 1 });
          } else {
            const o = { c: '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0') } as { c: string };
            try { (f as any).addBinding?.(o, 'c'); } catch {}
          }
        }
      }
    };

    const rebuild = () => {
      childPanes.splice(0).forEach((cp) => { try { cp.dispose(); } catch {} });
      if (layoutApi) { try { layoutApi.dispose(); } catch {} layoutApi = null; }
      if (!currentSpec) currentSpec = buildRandomSpec();
      layoutApi = addBladeLayout(folder, currentSpec);
      layoutApi.slots.forEach((s) => fillSlot(s));
      try { layoutApi.refresh(); } catch {}
    };

    currentSpec = buildRandomSpec();
    rebuild();

    return () => {
      try { childPanes.splice(0).forEach((cp) => cp.dispose()); } catch {}
      try { layoutApi?.dispose(); } catch {}
      try { pane.dispose(); } catch {}
      paneRef.current = null;
    };
  }, [onRun]);

  return <div ref={hostRef} style={{ width: '100%', height: 'auto' }} />;
};

export default LayoutPlaygroundPanel;

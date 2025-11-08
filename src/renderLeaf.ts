import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { addSizedButton } from './plugins/addSizedButton';
import { randomInt, type LeafPlan } from './layoutPlan';

export function renderLeaf(pane: Pane, leaf: LeafPlan): void {
  if (leaf.kind === 'button') {
    pane.addButton({ title: 'Button' });
  } else if (leaf.kind === 'sizedbutton') {
    addSizedButton(pane, { title: 'Multi-line', units: Math.max(2, leaf.sizedUnits ?? 2) });
  } else if (leaf.kind === 'number') {
    const o = { n: randomInt(-50, 50) };
    pane.addBinding(o, 'n', { min: -100, max: 100, step: 1 });
  } else if (leaf.kind === 'slider') {
    const o = { v: Math.random() };
    pane.addBinding(o, 'v', { min: 0, max: 1, step: 0.01, label: 'VeryLongSliderLabelText' } as any);
  } else if (leaf.kind === 'range') {
    const o = { lo: randomInt(0, 40), hi: randomInt(60, 100) };
    pane.addBinding(o, 'lo', { min: 0, max: 100, step: 1 });
    pane.addBinding(o, 'hi', { min: 0, max: 100, step: 1 });
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
    pane.addBinding(o, 'c');
  } else if (leaf.kind === 'point2d') {
    const o = { x: randomInt(-10, 10), y: randomInt(-10, 10) };
    pane.addBinding(o, 'x', { min: -100, max: 100, step: 1 });
    pane.addBinding(o, 'y', { min: -100, max: 100, step: 1 });
  } else if (leaf.kind === 'text') {
    const o = { s: `Text${randomInt(1, 99)}` };
    pane.addBinding(o, 's');
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
  const n = Math.max(1, leaf.customUnits ?? 1);
  const box = slot.ownerDocument.createElement('div');
  box.classList.add('tp-demo-domleaf');
  box.style.width = '100%';
  box.style.height = `calc(var(--cnt-usz) * ${n})`;
  box.style.boxSizing = 'border-box';
  box.style.display = 'flex';
  box.style.alignItems = 'center';
  box.style.justifyContent = 'center';
  box.style.border = '1px dashed #444';
  box.style.background = 'rgba(255,255,255,0.06)';
  box.textContent = `DOM(${n}u)`;
  slot.appendChild(box);
}
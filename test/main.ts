// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

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
  box.style.background = '#fff';
  box.style.border = '1px dashed #ddd';
  box.style.color = '#666';
  box.style.fontSize = '12px';
  slot.appendChild(box);
  if (inner) inner(box);
  else box.textContent = `${units}u DOM (not a Tweakpane control)`;
}

function drawWave(container: HTMLElement, color = '#3b82f6') {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(100, container.clientWidth - 16);
  canvas.height = Math.max(50, container.clientHeight - 16);
  canvas.style.maxWidth = '100%';
  const pad = 8;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
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

  // Row 1: Quick peek — Multiline button + DOM side-by-side
  const row1: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
    children: ['leaf', 'leaf']
  });
  const r1 = row1.getSlots();
  const r1l = new Pane({ container: r1[0] });
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
    (p as any).addBlade({ view: 'sized-button', title: `Button\n${i + 1}`, units: 2 });
  });

  // Row 3: equal — 3 columns
  const row3: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf', 'leaf']
  });
  row3.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    (p as any).addBlade({ view: 'sized-button', title: `Equal\n${i + 1}`, units: 2 });
  });

  // Row 4: 1fr 2fr
  const row4: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 2fr', children: ['leaf', 'leaf']
  });
  row4.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    (p as any).addBlade({ view: 'sized-button', title: `1fr\n2fr`, units: 2 });
  });

  // Row 5: 40 10 (normalized)
  const row5: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: [40, 10], children: ['leaf', 'leaf']
  });
  row5.getSlots().forEach((slot: HTMLElement, i: number) => {
    const p = new Pane({ container: slot });
    (p as any).addBlade({ view: 'sized-button', title: `Normalized`, units: 2 });
  });

  // Row 6: 3u DOM with a tiny waveform (arbitrary HTML)
  const row6: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr', children: ['leaf']
  });
  const r6 = row6.getSlots();
  mountDomUnits(r6[0], 3, (box) => drawWave(box));
}

main();

// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

function ensureRegistered(pane: Pane) {
  try { pane.registerPlugin(CompactKitBundle as any); } catch (e) {
    console.error('Failed to register CompactKitBundle:', e);
    throw e;
  }
}

function buildBasic(container: HTMLElement) {
  const pane = new Pane({ container, title: '基础分栏' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: '1fr 1fr', gutter: 6,
    children: ['leaf', 'leaf']
  });
  if (typeof api.getSlots !== 'function') throw new Error('plugin API missing');
  const slots = api.getSlots();
  const left = new Pane({ container: slots[0] });
  const right = new Pane({ container: slots[1] });
  (left as any).addBinding({ gain: 0.7 }, 'gain', { min: 0, max: 1 });
  (right as any).addBinding({ pitch: 440 }, 'pitch', { min: 220, max: 880 });
}

function buildCategory(container: HTMLElement) {
  const pane = new Pane({ container, title: '分类槽位' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: 'equal',
    children: ['track', 'master']
  });
  if (typeof api.getSlotsByCategory !== 'function') throw new Error('plugin API missing');
  const track = { name: 'Track', volume: 0.8, pan: 0 };
  api.getSlotsByCategory('track').forEach((slot: HTMLElement) => {
    const p = new Pane({ container: slot });
    (p as any).addBinding(track, 'volume', { min: 0, max: 1 });
    (p as any).addBinding(track, 'pan', { min: -1, max: 1 });
  });
  const master = { volume: 1.0 };
  api.getSlotsByCategory('master').forEach((slot: HTMLElement) => {
    const p = new Pane({ container: slot });
    (p as any).addBinding(master, 'volume', { min: 0, max: 1 });
  });
}

function buildPresets(container: HTMLElement) {
  const pane = new Pane({ container, title: '预设布局' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: 'panels',
    children: ['leaf', 'leaf', 'leaf']
  });
  if (typeof api.getSlots !== 'function') throw new Error('plugin API missing');
  const slots = api.getSlots();
  const a = new Pane({ container: slots[0] });
  const b = new Pane({ container: slots[1] });
  const c = new Pane({ container: slots[2] });
  (a as any).addBinding({ v: 0.2 }, 'v', { min: 0, max: 1, label: 'A' });
  (b as any).addBinding({ v: 0.5 }, 'v', { min: 0, max: 1, label: 'B' });
  (c as any).addBinding({ v: 0.8 }, 'v', { min: 0, max: 1, label: 'C' });
}

function buildNested(container: HTMLElement) {
  const pane = new Pane({ container, title: '嵌套布局' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'column', gutter: 6,
    children: [
      'leaf',
      { view: 'split-layout', direction: 'row', sizes: 'equal', children: ['leaf', 'leaf'] },
    ]
  });
  if (typeof api.getSlots !== 'function') throw new Error('plugin API missing');
  const slots = api.getSlots();
  const top = new Pane({ container: slots[0] });
  (top as any).addBinding({ title: 'Header' }, 'title');
  new Pane({ container: slots[1] }).addFolder({ title: 'Left' });
  new Pane({ container: slots[2] }).addFolder({ title: 'Right' });
}

function buildButton(container: HTMLElement) {
  const pane = new Pane({ container, title: '多行按钮' });
  ensureRegistered(pane);
  // Multi-line button demo
  (pane as any).addBlade({ view: 'sized-button', title: '多行\n按钮', units: 3 });
}

function buildCompact(container: HTMLElement) {
  const pane = new Pane({ container, title: '紧凑样式' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'column',
    children: ['leaf']
  });
  if (typeof api.getSlots !== 'function') throw new Error('plugin API missing');
  const slots = api.getSlots();
  const p = new Pane({ container: slots[0] });
  (p as any).addBinding({ level: 0.75 }, 'level', { min: 0, max: 1, label: '音量' });
  (p as any).addBinding({ freq: 440 }, 'freq', { min: 100, max: 1000, label: '频率' });
}

function buildInteractive(container: HTMLElement) {
  const pane = new Pane({ container, title: '可拖拽分割' });
  ensureRegistered(pane);
  const api: any = (pane as any).addBlade({
    view: 'split-layout', direction: 'row', sizes: [50, 50], gutter: 6, interactive: true,
    children: ['leaf', 'leaf']
  });
  if (typeof api.getSlots !== 'function') throw new Error('plugin API missing');
  const slots = api.getSlots();
  const left = new Pane({ container: slots[0] });
  const right = new Pane({ container: slots[1] });
  (left as any).addBinding({ a: 1 }, 'a', { min: 0, max: 2, step: 1 });
  (right as any).addBinding({ b: true }, 'b');
}

function main() {
  const elBasic = document.getElementById('host-basic') as HTMLElement | null;
  const elPresets = document.getElementById('host-presets') as HTMLElement | null;
  const elCat = document.getElementById('host-category') as HTMLElement | null;
  const elNest = document.getElementById('host-nested') as HTMLElement | null;
  const elBtn = document.getElementById('host-button') as HTMLElement | null;
  const elCompact = document.getElementById('host-compact') as HTMLElement | null;
  const elInter = document.getElementById('host-interactive') as HTMLElement | null;
  if (!elBasic || !elPresets || !elCat || !elNest || !elBtn || !elCompact || !elInter) return;

  buildBasic(elBasic);
  buildPresets(elPresets);
  buildCategory(elCat);
  buildNested(elNest);
  buildButton(elBtn);
  buildCompact(elCompact);
  buildInteractive(elInter);
}

main();

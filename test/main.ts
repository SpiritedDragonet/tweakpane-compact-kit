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
  (pane as any).addBlade({ view: 'sized-button', title: 'Run\nAction', units: 2 });
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
  const elCat = document.getElementById('host-category') as HTMLElement | null;
  const elNest = document.getElementById('host-nested') as HTMLElement | null;
  const elBtn = document.getElementById('host-button') as HTMLElement | null;
  const elInter = document.getElementById('host-interactive') as HTMLElement | null;
  if (!elBasic || !elCat || !elNest || !elBtn || !elInter) return;

  buildBasic(elBasic);
  buildCategory(elCat);
  buildNested(elNest);
  buildButton(elBtn);
  buildInteractive(elInter);
}

main();

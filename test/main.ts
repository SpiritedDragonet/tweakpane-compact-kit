// Minimal Tweakpane demo for tweakpane-compact-kit
// - Registers SplitLayoutPlugin and SizedButtonPlugin
// - Builds a 2-column layout (left: column split by units, right: leaf)

import { Pane } from 'tweakpane';
import { CompactKitBundle } from 'tweakpane-compact-kit';

function main() {
  const host = document.getElementById('pane');
  if (!host) return;

  const pane = new Pane({ container: host, title: 'Compact Kit Demo' });

  // 2 columns: left is column-split by units, right is a leaf slot
  // Register plugin bundle (v4). If失败，直接报错，确保我们只通过正式插件路径运行。
  try {
    pane.registerPlugin(CompactKitBundle as any);
  } catch (e) {
    console.error('Failed to register CompactKitBundle:', e);
    throw e;
  }

  // Build split layout via正式插件 API
  const splitApi: any = (pane as any).addBlade({
    view: 'split-layout',
    direction: 'row',
    sizes: '1fr 2fr',
    gutter: 6,
    interactive: false,
    children: [
      {
        view: 'split-layout',
        direction: 'column',
        // Three rows by units (e.g., 2,1,1)
        rowUnits: [2, 1, 1],
        children: ['leaf', 'leaf', 'leaf'],
        gutter: 6,
      },
      'leaf',
    ],
  });

  if (typeof (splitApi as any).getSlots !== 'function') {
    throw new Error('splitApi.getSlots is not available; plugin API not installed');
  }
  const slots: HTMLElement[] = (splitApi as any).getSlots();

  // Left column rows
  const state = { opacity: 0.75, speed: 2, width: 320, height: 180, enabled: true, threshold: 42 };
  const row1 = new Pane({ container: slots[0] });
  (row1 as any).addBinding(state, 'opacity', { min: 0, max: 1, label: 'Opacity' });
  (row1 as any).addBinding(state, 'speed', { min: 0, max: 10, label: 'Speed' });

  const row2 = new Pane({ container: slots[1] });
  (row2 as any).addBinding(state, 'width', { min: 100, max: 600, label: 'Width' });
  (row2 as any).addBinding(state, 'height', { min: 100, max: 400, label: 'Height' });

  const row3 = new Pane({ container: slots[2] });
  // Demo with regular button
  (row3 as any).addButton({ title: 'Run Action' });

  // Right side leaf
  const right = new Pane({ container: slots[3] });
  (right as any).addBinding(state, 'enabled', { label: 'Enabled' });
  (right as any).addBinding(state, 'threshold', { min: 0, max: 100, step: 1, label: 'Threshold' });

  // Cleanup on hot-reload
  if (import.meta && (import.meta as any).hot) {
    (import.meta as any).hot.dispose(() => {
      try { row1.dispose(); } catch {}
      try { row2.dispose(); } catch {}
      try { row3.dispose(); } catch {}
      try { right.dispose(); } catch {}
      try { pane.dispose(); } catch {}
    });
  }
}

main();

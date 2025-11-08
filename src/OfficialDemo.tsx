import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { SplitLayoutPlugin } from './plugins/SplitLayoutPlugin';
import { installBladeViewShims } from './plugins/tpBladePlugins';
import { addSizedButton } from './plugins/addSizedButton';

export const OfficialDemo: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const pane = new Pane({ container, title: 'Split Layout Plugin Demo (Official)' });

    // Register required plugins
    try { pane.registerPlugin(EssentialsPlugin as any); } catch {}
    try { pane.registerPlugin(SplitLayoutPlugin as any); } catch {}

    // Demo 1: Horizontal split with equal columns
    const demo1Folder = pane.addFolder({ title: 'Demo 1: Equal Horizontal Split', expanded: true });
    const uninstall1 = installBladeViewShims(demo1Folder as any);
    const equalSplit = demo1Folder.addBlade({
      view: 'split-equal',
      direction: 'row',
      count: 3,
      gutter: 4,
      interactive: false
    });
    const slots1 = equalSplit.getSlots();
    const childPane1 = new Pane({ container: slots1[0] });
    const childPane2 = new Pane({ container: slots1[1] });
    const childPane3 = new Pane({ container: slots1[2] });

    // Add controls to first column
    childPane1.addButton({ title: 'Button A' });
    childPane1.addBinding({ value: 50 }, 'value', { min: 0, max: 100 });
    childPane1.addBinding({ color: '#ff0000' }, 'color');

    // Add controls to second column
    childPane2.addButton({ title: 'Button B' });
    childPane2.addBinding({ value: 25 }, 'value', { min: 0, max: 100 });
    childPane2.addBinding({ enabled: true }, 'enabled');

    // Add controls to third column
    childPane3.addButton({ title: 'Button C' });
    childPane3.addBinding({ value: 75 }, 'value', { min: 0, max: 100 });
    childPane3.addBinding({ text: 'Sample' }, 'text');

    // Demo 2: Horizontal split with ratio
    const demo2Folder = pane.addFolder({ title: 'Demo 2: Ratio Horizontal Split', expanded: false });
    const uninstall2 = installBladeViewShims(demo2Folder as any);
    const ratioSplit = demo2Folder.addBlade({
      view: 'split-ratio',
      direction: 'row',
      ratio: 0.3,
      gutter: 4,
      interactive: false
    });
    const slots2 = ratioSplit.getSlots();
    const childPane4 = new Pane({ container: slots2[0] });
    const childPane5 = new Pane({ container: slots2[1] });

    // Left column (30%)
    childPane4.addButton({ title: 'Narrow' });
    childPane4.addBinding({ value: 10 }, 'value', { min: 0, max: 100 });

    // Right column (70%)
    childPane5.addButton({ title: 'Wide Column' });
    childPane5.addBinding({ value: 50 }, 'value', { min: 0, max: 100, label: 'VeryLongLabelTextHere' });
    const pos = { x: 50, y: 50 };
    childPane5.addBinding(pos, 'x', { min: 0, max: 100, step: 1 });
    childPane5.addBinding(pos, 'y', { min: 0, max: 100, step: 1 });

    // Demo 3: Vertical split with row units
    const demo3Folder = pane.addFolder({ title: 'Demo 3: Vertical Split with Row Units', expanded: false });
    const uninstall3 = installBladeViewShims(demo3Folder as any);
    const verticalSplit = demo3Folder.addBlade({
      view: 'split-layout',
      direction: 'column',
      rowUnits: [2, 3, 1],
      gutter: 4,
      interactive: false,
      children: ['leaf', 'leaf', 'leaf']
    });
    const slots3 = verticalSplit.getSlots();
    const childPane6 = new Pane({ container: slots3[0] });
    const childPane7 = new Pane({ container: slots3[1] });
    const childPane8 = new Pane({ container: slots3[2] });

    // Row 1 (2 units)
    childPane6.addButton({ title: 'Two Unit Button' });
    childPane6.addBinding({ value: 20 }, 'value', { min: 0, max: 100 });

    // Row 2 (3 units)
    childPane7.addFolder({ title: 'Folder' });
    childPane7.addBinding({ color: '#00ff00' }, 'color');
    childPane7.addBinding({ ratio: 0.5 }, 'ratio', { min: 0, max: 1 });
    childPane7.addButton({ title: 'Action' });

    // Row 3 (1 unit)
    childPane8.addButton({ title: 'Single' });

    // Demo 4: Nested splits
    const demo4Folder = pane.addFolder({ title: 'Demo 4: Nested Splits', expanded: false });
    const uninstall4 = installBladeViewShims(demo4Folder as any);
    const nestedSplit = demo4Folder.addBlade({
      view: 'split-equal',
      direction: 'row',
      count: 2,
      gutter: 4,
      interactive: false,
      children: [
        // Left: Vertical split
        {
          view: 'split-layout',
          direction: 'column',
          rowUnits: [1, 1],
          gutter: 4,
          interactive: false,
          children: ['leaf', 'leaf']
        },
        // Right: Single leaf
        'leaf'
      ]
    });
    const slots4 = nestedSplit.getSlots();
    const childPane9 = new Pane({ container: slots4[0] });
    const childPane10 = new Pane({ container: slots4[1] });
    const childPane11 = new Pane({ container: slots4[2] });

    // Top left
    childPane9.addButton({ title: 'TL' });
    // Bottom left
    childPane10.addButton({ title: 'BL' });
    // Right column
    childPane11.addButton({ title: 'Right' });
    childPane11.addBinding({ value: 60 }, 'value', { min: 0, max: 100 });

    // Demo 5: Mixed content
    const demo5Folder = pane.addFolder({ title: 'Demo 5: Mixed Content Types', expanded: false });
    const uninstall5 = installBladeViewShims(demo5Folder as any);
    const mixedSplit = demo5Folder.addBlade({
      view: 'split-equal',
      direction: 'row',
      count: 2,
      gutter: 4,
      interactive: false
    });
    const slots5 = mixedSplit.getSlots();
    const childPane12 = new Pane({ container: slots5[0] });
    const childPane13 = new Pane({ container: slots5[1] });

    // Left side - various inputs
    childPane12.addBinding({ number: 42 }, 'number', { min: 0, max: 100 });
    childPane12.addBinding({ percent: 0.75 }, 'percent', { min: 0, max: 1 });
    childPane12.addBinding({ color: '#ff00ff' }, 'color');
    childPane12.addBinding({ enabled: true }, 'enabled');
    childPane12.addBinding({ text: 'Hello' }, 'text');

    // Right side - buttongrid
    childPane13.addBlade({
      view: 'buttongrid',
      cells: [
        { title: 'A' },
        { title: 'B' },
        { title: 'C' },
        { title: 'D' },
      ],
      size: [2, 2],
    });

    // Demo 6: Sized buttons (multi-unit buttons)
    const demo6Folder = pane.addFolder({ title: 'Demo 6: Sized Buttons', expanded: false });
    const uninstall6 = installBladeViewShims(demo6Folder as any);
    const sizedSplit = demo6Folder.addBlade({
      view: 'split-equal',
      direction: 'row',
      count: 2,
      gutter: 4,
      interactive: false
    });
    const slots6 = sizedSplit.getSlots();
    const childPane14 = new Pane({ container: slots6[0] });
    const childPane15 = new Pane({ container: slots6[1] });

    // Left side - sized buttons with gap compensation
    addSizedButton(childPane14, { title: '1 Unit Button', units: 1, onClick: () => console.log('1 unit') });
    addSizedButton(childPane14, { title: '2 Unit Button', units: 2, onClick: () => console.log('2 units') });
    addSizedButton(childPane14, { title: '3 Unit Button', units: 3, onClick: () => console.log('3 units') });

    // Right side - mix of sized buttons and controls
    childPane15.addButton({ title: 'Standard Button' });
    addSizedButton(childPane15, { title: '2 Unit Wide', units: 2, onClick: () => console.log('2 units') });
    childPane15.addBinding({ value: 30 }, 'value', { min: 0, max: 100 });

    return () => {
      try { uninstall1(); } catch {}
      try { uninstall2(); } catch {}
      try { uninstall3(); } catch {}
      try { uninstall4(); } catch {}
      try { uninstall5(); } catch {}
      try { uninstall6(); } catch {}
      childPane1.dispose();
      childPane2.dispose();
      childPane3.dispose();
      childPane4.dispose();
      childPane5.dispose();
      childPane6.dispose();
      childPane7.dispose();
      childPane8.dispose();
      childPane9.dispose();
      childPane10.dispose();
      childPane11.dispose();
      childPane12.dispose();
      childPane13.dispose();
      childPane14.dispose();
      childPane15.dispose();
      pane.dispose();
    };
  }, []);

  return (
    <div className="demo-container">
      <div ref={hostRef} className="pane-container"></div>
    </div>
  );
};
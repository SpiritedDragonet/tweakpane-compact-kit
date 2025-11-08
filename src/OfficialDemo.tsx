import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { SplitLayoutPlugin } from './plugins/SplitLayoutPlugin';
import { installBladeViewShims } from './plugins/tpBladePlugins';
import { useLayout } from './LayoutContext';
import { randomInt, type LayoutPlan } from './layoutPlan';

export const OfficialDemo: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { layoutPlan } = useLayout();

  useEffect(() => {
    const container = hostRef.current;
    if (!container || !layoutPlan) return;

    const pane = new Pane({ container, title: 'Plugin Demo (Self-Contained)' });

    // Register required plugins
    try { pane.registerPlugin(EssentialsPlugin as any); } catch {}
    try { pane.registerPlugin(SplitLayoutPlugin as any); } catch {}

    const uninstall = installBladeViewShims(pane as any);

    // Build split layout based on plan
    const buildSpecFromPlan = (plan: LayoutPlan): any => {
      const colSizes = Array.from({ length: plan.colCount }, () => 100 / plan.colCount);
      const children = plan.cols.map((col) => ({
        view: 'split-layout',
        direction: 'column',
        rowUnits: col.rowUnits.slice(),
        children: Array.from({ length: col.rows }, () => 'leaf'),
        gutter: 4,
        interactive: false,
      }));
      return {
        view: 'split-layout',
        direction: 'row',
        sizes: colSizes,
        children,
        gutter: 4,
        interactive: false,
      };
    };

    const splitApi = pane.addBlade(buildSpecFromPlan(layoutPlan));
    const slots = splitApi.getSlots();
    const childPanes: Pane[] = [];

    // Fill slots with controls based on plan
    let slotIndex = 0;
    for (let c = 0; c < layoutPlan.cols.length; c++) {
      for (let r = 0; r < layoutPlan.cols[c].rows; r++) {
        if (slotIndex >= slots.length) break;
        const p = new Pane({ container: slots[slotIndex] });
        const leaf = layoutPlan.cols[c].leaves[r];
        childPanes.push(p);

        // Add control based on leaf kind
        if (leaf.kind === 'button') {
          p.addButton({ title: 'Button' });
        } else if (leaf.kind === 'number' || leaf.kind === 'slider') {
          p.addBinding({ value: randomInt(0, 100) }, 'value', { min: 0, max: 100 });
        } else {
          p.addButton({ title: leaf.kind });
        }

        slotIndex++;
      }
    }

    return () => {
      try { uninstall(); } catch {}
      childPanes.forEach(cp => { try { cp.dispose(); } catch {} });
      pane.dispose();
    };
  }, [layoutPlan]);

  return (
    <div className="demo-container">
      <div ref={hostRef} className="pane-container"></div>
    </div>
  );
};
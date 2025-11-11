import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import * as TweakpaneCompactKit from '../../dist/tweakpane-compact-kit.es.js';
import { useLayout } from './LayoutContext';
import { type LayoutPlan } from './layoutPlan';
import { renderLeaf, renderCustomDom } from './renderLeaf';

export const OfficialDemo: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { layoutPlan, generateLayout } = useLayout();

  useEffect(() => {
    const container = hostRef.current;
    if (!container || !layoutPlan) return;

    const pane = new Pane({ container, title: 'Plugin Demo (Self-Contained)' });

    // Register required plugins
    try { pane.registerPlugin(EssentialsPlugin as any); } catch {}
    try { pane.registerPlugin(TweakpaneCompactKit.SplitLayoutPlugin); } catch (e) {
      console.error('Failed to register SplitLayoutPlugin:', e);
    }
    try { pane.registerPlugin(TweakpaneCompactKit.SizedButtonPlugin); } catch (e) {
      console.error('Failed to register SizedButtonPlugin:', e);
    }

    // Add control buttons
    const controls = pane.addFolder({ title: 'Controls', expanded: true });
    controls.addButton({ title: 'Random Layout', onClick: () => generateLayout() });

    // Add folder for split layout
    const folder = pane.addFolder({ title: 'Split Layout', expanded: true });

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

    const splitApi = folder.addBlade(buildSpecFromPlan(layoutPlan));
    const slots = splitApi.getSlots();
    const childPanes: Pane[] = [];

    // Fill slots with controls based on plan
    let slotIndex = 0;
    for (let c = 0; c < layoutPlan.cols.length; c++) {
      for (let r = 0; r < layoutPlan.cols[c].rows; r++) {
        if (slotIndex >= slots.length) break;
        const slot = slots[slotIndex];
        const leaf = layoutPlan.cols[c].leaves[r];

        if (leaf.kind === 'customDom') {
          renderCustomDom(slot, leaf);
        } else {
          const p = new Pane({ container: slot });
          try { p.registerPlugin(EssentialsPlugin as any); } catch {}
          try { p.registerPlugin(TweakpaneCompactKit.SizedButtonPlugin as any); } catch {}
          childPanes.push(p);
          renderLeaf(p, leaf);
        }

        slotIndex++;
      }
    }

    return () => {
      childPanes.forEach(cp => { try { cp.dispose(); } catch {} });
      pane.dispose();
    };
  }, [layoutPlan, generateLayout]);

  return (
    <div className="demo-container">
      <div ref={hostRef} className="pane-container"></div>
    </div>
  );
};
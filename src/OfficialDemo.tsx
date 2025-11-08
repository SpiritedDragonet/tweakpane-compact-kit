import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import { SplitLayoutPlugin } from './plugins/SplitLayoutPlugin';
import { installBladeViewShims } from './plugins/tpBladePlugins';

export const OfficialDemo: React.FC = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;
    const pane = new Pane({ container, title: 'Plugin Demo (Self-Contained)' });

    // Register required plugins
    try { pane.registerPlugin(EssentialsPlugin as any); } catch {}
    try { pane.registerPlugin(SplitLayoutPlugin as any); } catch {}

    // Simple demo: just two columns with basic controls
    const uninstall1 = installBladeViewShims(pane as any);
    const equalSplit = pane.addBlade({
      view: 'split-equal',
      direction: 'row',
      count: 2,
      gutter: 4,
      interactive: false
    });
    const slots1 = equalSplit.getSlots();
    const childPane1 = new Pane({ container: slots1[0] });
    const childPane2 = new Pane({ container: slots1[1] });

    // Add controls to first column
    childPane1.addButton({ title: 'Button A' });
    childPane1.addBinding({ value: 50 }, 'value', { min: 0, max: 100 });

    // Add controls to second column
    childPane2.addButton({ title: 'Button B' });
    childPane2.addBinding({ value: 25 }, 'value', { min: 0, max: 100 });

    return () => {
      try { uninstall1(); } catch {}
      childPane1.dispose();
      childPane2.dispose();
      pane.dispose();
    };
  }, []);

  return (
    <div className="demo-container">
      <div ref={hostRef} className="pane-container"></div>
    </div>
  );
};
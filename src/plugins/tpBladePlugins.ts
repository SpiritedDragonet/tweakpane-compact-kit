// Shim-style Tweakpane plugin installers that enable using
// pane.addBlade({ view: 'blade-layout', ...spec }) and
// pane.addBlade({ view: 'sized-button', title, units })
// without touching Tweakpane internals. This patches the provided
// API object's addBlade method to intercept our custom views.
//
// This is a pragmatic bridge until we publish formal BladePlugin
// objects; it behaves like a plugin from the caller perspective.

import type { Pane } from 'tweakpane';
import type { BladeLayoutSpec } from './BladeLayout';
import { addBladeLayout } from './addBladeLayout';
import { addSizedButton } from './addSizedButton';
import { addSplitLayout } from './SplitLayoutPlugin';

export type UninstallFn = () => void;

// Install shims on a specific Tweakpane API (Pane or Folder Api).
export function installBladeViewShims(targetApi: any): UninstallFn {
  if (!targetApi || typeof targetApi.addBlade !== 'function') return () => {};
  const originalAddBlade = targetApi.addBlade.bind(targetApi);
  targetApi.addBlade = function patchedAddBlade(spec: any): any {
    try {
      if (spec && typeof spec === 'object') {
        const view = String(spec.view || '');
        if (view === 'blade-layout') {
          const layoutSpec = spec as BladeLayoutSpec;
          return addBladeLayout(this, layoutSpec);
        }
        if (view === 'split-layout') {
          return addSplitLayout(this, spec);
        }
        if (view === 'split-equal') {
          const dir = (spec.direction === 'column') ? 'column' : 'row';
          const childLen = Array.isArray(spec.children) ? spec.children.length : 0;
          const countSrc = (spec.count ?? (childLen || 2));
          const count = Math.max(1, Math.floor(countSrc));
          const children = Array.isArray(spec.children) && spec.children.length >= count
            ? spec.children.slice(0, count)
            : Array.from({ length: count }, () => 'leaf');
          const s = { view: 'split-layout', direction: dir, mode: 'equal', count, children, gutter: spec.gutter, interactive: !!spec.interactive } as any;
          return addSplitLayout(this, s);
        }
        if (view === 'split-ratio') {
          const dir = (spec.direction === 'column') ? 'column' : 'row';
          const r = Number.isFinite(spec.ratio) ? spec.ratio : 0.5;
          const children = Array.isArray(spec.children) && spec.children.length >= 2
            ? spec.children.slice(0, 2)
            : ['leaf', 'leaf'];
          const s = { view: 'split-layout', direction: dir, mode: 'ratio', ratio: r, children, gutter: spec.gutter, interactive: !!spec.interactive } as any;
          return addSplitLayout(this, s);
        }
        if (view === 'sized-button') {
          const opts = { title: spec.title ?? '', units: spec.units ?? 1, onClick: spec.onClick };
          return addSizedButton(this as Pane, opts);
        }
      }
    } catch {}
    return originalAddBlade(spec);
  };
  return () => { try { targetApi.addBlade = originalAddBlade; } catch {} };
}

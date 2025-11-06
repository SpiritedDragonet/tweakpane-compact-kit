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


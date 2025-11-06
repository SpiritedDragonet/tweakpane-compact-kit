// Public helper to attach a BladeLayout to a Tweakpane Folder/Pane API
// without exposing internal DOM details. It mounts the layout under the
// host's content container (for Folder) or under the API element fallback.
//
// This wraps mountBladeLayout and returns a stable API for callers.

import { mountBladeLayout } from './BladeLayout';
import type { BladeLayoutSpec } from './BladeLayout';

export type BladeLayoutApi = {
  root: HTMLElement;
  slots: HTMLElement[];
  refresh(): void;
  dispose(): void;
};

export function addBladeLayout(hostApi: any, spec: BladeLayoutSpec): BladeLayoutApi {
  // Prefer Folder container element when available
  const contentEl: HTMLElement | null = (hostApi?.controller?.view?.containerElement ?? null) as HTMLElement | null;
  const hostEl: HTMLElement = contentEl || (hostApi?.element as HTMLElement) || (hostApi?.controller?.view?.element as HTMLElement);
  if (!hostEl) throw new Error('addBladeLayout: invalid host API (no element)');

  // Create mounting wrapper to keep layout isolated
  const wrapper = hostEl.ownerDocument.createElement('div');
  wrapper.style.width = '100%';
  wrapper.style.boxSizing = 'border-box';
  // Scope class for layout-specific CSS (spacing resets, etc.)
  wrapper.classList.add('tp-bl-scope');
  hostEl.appendChild(wrapper);

  const inst = mountBladeLayout({ container: wrapper, spec });

  return {
    root: inst.root,
    slots: inst.slots,
    refresh: () => inst.refresh(),
    dispose: () => {
      try { inst.dispose(); } catch {}
      try { hostEl.removeChild(wrapper); } catch {}
    },
  };
}

// SizedButton Blade Plugin for Tweakpane v4
// - Provides multi-line buttons with configurable heights
// - Automatically calculates height based on Tweakpane unit size
// - Includes gap compensation for proper alignment
// - Minimal API: { view: 'sized-button', title?, units?, onClick? }

// import type { BladeApi } from 'tweakpane';
// Using any to avoid coupling to Tweakpane's internal types

import {
  normalizeButtonContent,
  renderButtonContent,
  type ButtonContent,
  type ButtonIcon,
} from './button/buttonContent';
import { createButtonShell } from './button/buttonShell';

// Controller for the sized button blade
class SizedButtonController {
  public blade: any;
  public view: { element: HTMLElement };
  public viewProps: any;
  public buttonEl!: HTMLButtonElement;
  private disposeFn: () => void;

  constructor(args: {
    document: Document;
    params: any;
    viewProps?: any;
  }) {
    const { document, params, viewProps } = args;
    const shell = createButtonShell(document, {
      rootClassName: 'tp-sized-button',
      units: params.units || 1,
    });

    while (shell.contentHost.firstChild) {
      shell.contentHost.firstChild.remove();
    }
    shell.contentHost.appendChild(renderButtonContent(document, params.content));

    this.view = { element: shell.root };
    this.blade = (args as any).blade;
    this.viewProps = viewProps;
    this.buttonEl = shell.button;

    // Apply click handler
    if (params.onClick && typeof params.onClick === 'function') {
      shell.button.addEventListener('click', params.onClick);
    }

    // Store elements for disposal
    this.disposeFn = () => {
      shell.button.removeEventListener('click', params.onClick);
    };

    // Hook disposal to view props lifecycle
    try { this.viewProps?.handleDispose?.(() => this.dispose()); } catch {}
  }

  dispose() {
    if (this.disposeFn) {
      this.disposeFn();
    }
  }
}

// API class for the sized button
class SizedButtonApi {
  public controller: any;
  private _c: SizedButtonController;

  constructor(controller: SizedButtonController) {
    this._c = controller;
    this.controller = controller as any;
  }

  dispose() {
    this._c.dispose();
  }

  on(eventName: string, handler: Function) {
    if (eventName === 'click') {
      this._c.buttonEl?.addEventListener('click', handler as any);
    }
    return this;
  }

  off(eventName: string, handler: Function) {
    if (eventName === 'click') {
      this._c.buttonEl?.removeEventListener('click', handler as any);
    }
    return this;
  }
}

// NOTE: The 'core' semver here refers to @tweakpane/core's major version.
// For Tweakpane v4.x, @tweakpane/core's major is 2.

// Plugin definition
export const SizedButtonPlugin: any = {
  id: 'sized-button',
  type: 'blade',
  // Tweakpane compatibility: match @tweakpane/core major version (v2 for Tweakpane v4)
  core: { major: 2, minor: 0, patch: 0 },
  css: `
    /* Sized button blade: keep defaults; only ensure sizing + multiline label */
    .tp-sized-button { width: 100%; box-sizing: border-box; }
    .tp-sized-button .tp-btnv { width: 100%; }
    .tp-sized-button .tp-btnv_b { width: 100%; box-sizing: border-box; }
    .tp-sized-button .tp-btnv_c {
      align-items: center;
      display: inline-flex;
      gap: 6px;
      justify-content: center;
      width: 100%;
    }
    .tp-btnc {
      align-items: center;
      display: inline-flex;
      gap: 6px;
      justify-content: center;
      max-width: 100%;
    }
    .tp-btnc_t { white-space: pre-line; }
    .tp-btnc_i {
      display: block;
      fill: none;
      height: 16px;
      stroke: currentColor;
      stroke-width: 1.5;
      width: 16px;
    }
  `,
  accept(params: any) {
    if (!params || params.view !== 'sized-button') return null;

    // Validate parameters
    const units = Math.max(1, Math.floor(params.units ?? 1));
    const content = normalizeButtonContent(params as {
      title?: string;
      icon?: ButtonIcon;
      content?: ButtonContent;
    });
    const onClick = params.onClick;

    return {
      params: {
        view: 'sized-button',
        content,
        units,
        onClick
      }
    };
  },
  controller(args: any) {
    return new SizedButtonController(args);
  },
  api(args: any) {
    if (!(args.controller instanceof SizedButtonController)) return null;
    return new SizedButtonApi(args.controller as SizedButtonController);
  }
};

export type SizedButtonOptions = {
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
  units?: number; // number of blade rows, integer >= 1
  onClick?: () => void;
};

// SizedButton Blade Plugin for Tweakpane v4
// - Provides multi-line buttons with configurable heights
// - Automatically calculates height based on Tweakpane unit size
// - Includes gap compensation for proper alignment
// - Minimal API: { view: 'sized-button', title?, units?, onClick? }

// import type { BladeApi } from 'tweakpane';
// Using any to avoid coupling to Tweakpane's internal types

// Controller for the sized button blade
class SizedButtonController {
  public blade: any;
  public view: { element: HTMLElement };
  public viewProps: any;
  private disposeFn: () => void;

  constructor(args: {
    document: Document;
    params: any;
    viewProps?: any;
  }) {
    const { document, params, viewProps } = args;
    const element = document.createElement('div');
    element.className = 'tp-sized-button';
    this.view = { element };
    this.blade = (args as any).blade;
    this.viewProps = viewProps;

    // Create container for the button
    const container = document.createElement('div');
    container.className = 'tp-sb-container';
    element.appendChild(container);

    // Create the button
    const button = document.createElement('button');
    button.className = 'tp-sb-button tp-btn-v';
    button.textContent = params.title || '';
    container.appendChild(button);

    // Apply click handler
    if (params.onClick && typeof params.onClick === 'function') {
      button.addEventListener('click', params.onClick);
    }

    // Store elements for disposal
    this.disposeFn = () => {
      button.removeEventListener('click', params.onClick);
    };

    // Set initial height
    this.updateHeight(params.units || 1);

    // Create blade API
    this.blade = {
      controller: this,
      disabled: false,
      hidden: false,
      on(eventName: string, handler: Function) {
        // Basic event handling
        if (eventName === 'click') {
          button.addEventListener('click', handler as EventListener);
        }
        return this;
      },
      off(eventName: string, handler: Function) {
        if (eventName === 'click') {
          button.removeEventListener('click', handler as EventListener);
        }
        return this;
      },
      dispose: () => this.dispose(),
    } as any;
    try { this.viewProps?.handleDispose?.(() => this.dispose()); } catch {}
  }

  updateHeight(units: number) {
    const button = this.view.element.querySelector('.tp-sb-button') as HTMLElement;
    if (!button) return;

    // Compute 1 blade unit (px)
    const computeUnitPx = (): number => {
      const doc = this.view.element.ownerDocument;
      const findContainer = (el: HTMLElement | null): HTMLElement | null => {
        let cur: HTMLElement | null = el;
        while (cur) {
          if (cur.classList?.contains('tp-cntv') || cur.classList?.contains('tp-rotv')) return cur;
          cur = cur.parentElement;
        }
        return el;
      };
      const cont = findContainer(this.view.element) || this.view.element;
      try {
        const cs = (cont && (cont.ownerDocument?.defaultView || window).getComputedStyle(cont)) as CSSStyleDeclaration;
        const v = cs.getPropertyValue('--cnt-usz')?.trim();
        if (v) {
          const m = v.match(/([0-9]+\.?[0-9]*)\s*px/i);
          if (m) return Math.max(1, Math.round(parseFloat(m[1])));
          const f = parseFloat(v);
          if (Number.isFinite(f) && f > 0) return Math.round(f);
        }
      } catch {}
      try {
        const probe = doc.createElement('div');
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.height = 'var(--cnt-usz)';
        probe.style.width = '1px';
        (cont || this.view.element).appendChild(probe);
        const px = probe.getBoundingClientRect().height || probe.offsetHeight || 0;
        probe.remove();
        if (px) return Math.max(1, Math.round(px));
      } catch {}
      return 0;
    };

    const unitPx = computeUnitPx();
    const gutter = 4; // match the gutter in SplitLayoutPlugin

    // Apply height with gap compensation
    if (unitPx > 0) {
      const totalHeight = units * unitPx + (units - 1) * gutter;
      button.style.height = `${totalHeight}px`;
    } else {
      const gapPx = (units - 1) * gutter;
      button.style.height = `calc(var(--cnt-usz) * ${units} + ${gapPx}px)`;
    }
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
    return this._c.blade.on(eventName, handler);
  }

  off(eventName: string, handler: Function) {
    return this._c.blade.off(eventName, handler);
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
    /* Sized button blade styles */
    .tp-sized-button {
      width: 100%;
      box-sizing: border-box;
    }

    .tp-sb-container {
      width: 100%;
      padding: 0;
      margin: 0;
    }

    .tp-sb-button.tp-btn-v {
      width: 100%;
      min-width: 0;
      padding: 0 8px;
      font-size: 12px;
      line-height: 1.4;
      font-weight: 600;
      letter-spacing: 0.08em;
      border-radius: 4px;
      border: 1px solid var(--base-bg);
      background-color: var(--base-bg);
      color: var(--base-fg);
      cursor: pointer;
      transition: all 0.1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      white-space: pre-line;
      word-break: keep-all;
      box-sizing: border-box;
    }

    .tp-sb-button.tp-btn-v:hover {
      background-color: var(--btn-bg-hover);
      border-color: var(--btn-border-hover);
    }

    .tp-sb-button.tp-btn-v:active {
      background-color: var(--btn-bg-active);
      border-color: var(--btn-border-active);
    }

    .tp-sb-button.tp-btn-v:focus {
      outline: none;
      box-shadow: 0 0 0 1px var(--accent-color);
    }

    /* Align with Tweakpane's compact styling */
    .tp-sb-container {
      padding: 0;
    }
    .tp-sb-button.tp-btn-v {
      margin: 0;
    }
  `,
  accept(params: any) {
    if (!params || params.view !== 'sized-button') return null;

    // Validate parameters
    const units = Math.max(1, Math.floor(params.units ?? 1));
    const title = params.title ?? '';
    const onClick = params.onClick;

    return {
      params: {
        view: 'sized-button',
        title,
        units,
        onClick
      }
    };
  },
  controller(args: any) {
    return new SizedButtonController(args);
  },
  api(args: any) {
    return new SizedButtonApi(args.controller as SizedButtonController);
  }
};

export type SizedButtonOptions = {
  title?: string;
  units?: number; // number of blade rows, integer >= 1
  onClick?: () => void;
};

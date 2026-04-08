/**
 * Sized button blade plugin.
 *
 * This is the simpler of the two custom button plugins: it renders a button
 * with a fixed vertical span and an optional click handler, while reusing the
 * same button shell and content renderer as the boolean button.
 */

import {
  normalizeButtonContent,
  renderButtonContent,
  type ButtonContent,
  type ButtonIcon,
} from './button/buttonContent';
import { createButtonShell } from './button/buttonShell';
import { BUTTON_CONTENT_CSS } from './button/buttonStyles';
import { bindBladePositionClasses } from './shared/bladePositionClasses';
import { copyDeclaredUnitState } from './split/domUnitState';

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
      iconSize: params.iconSize,
    });

    while (shell.contentHost.firstChild) {
      shell.contentHost.firstChild.remove();
    }
    shell.contentHost.appendChild(renderButtonContent(document, params.content));

    const row = document.createElement('div');
    row.className = 'tp-lblv tp-lblv-nol';

    const label = document.createElement('div');
    label.className = 'tp-lblv_l';
    row.appendChild(label);

    const value = document.createElement('div');
    value.className = 'tp-lblv_v';
    value.appendChild(shell.root);
    row.appendChild(value);

    copyDeclaredUnitState(shell.root, row);

    this.view = { element: row };
    this.blade = (args as any).blade;
    this.viewProps = viewProps;
    this.buttonEl = shell.button;
    const cleanupPositionClasses = bindBladePositionClasses(this.blade, row);

    try { this.viewProps?.bindClassModifiers?.(row); } catch {}
    try { this.viewProps?.bindDisabled?.(shell.button); } catch {}

    // Click binding stays local to the button shell. The plugin does not need a
    // value model because it behaves like a pure action blade.
    if (params.onClick && typeof params.onClick === 'function') {
      shell.button.addEventListener('click', params.onClick);
    }

    this.disposeFn = () => {
      shell.button.removeEventListener('click', params.onClick);
      cleanupPositionClasses();
    };

    try { this.viewProps?.handleDispose?.(() => this.dispose()); } catch {}
  }

  dispose() {
    if (this.disposeFn) {
      this.disposeFn();
    }
  }
}

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

/**
 * Plugin descriptor consumed by Tweakpane.
 *
 * The plugin intentionally keeps its public shape tiny: content, units, and an
 * optional click handler. Anything more complicated is expected to build on top
 * of this primitive rather than inside it.
 */
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
    ${BUTTON_CONTENT_CSS}
  `,
  accept(params: any) {
    if (!params || params.view !== 'sized-button') return null;

    const units = Math.max(1, Math.floor(params.units ?? 1));
    const content = normalizeButtonContent(params as {
      title?: string;
      icon?: ButtonIcon;
      content?: ButtonContent;
      iconSize?: number;
    });
    const onClick = params.onClick;
    const iconSize = typeof params.iconSize === 'number' ? params.iconSize : undefined;

    return {
      params: {
        view: 'sized-button',
        content,
        units,
        onClick,
        iconSize,
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
  iconSize?: number;
  // Number of vertical tracks the button should occupy.
  units?: number;
  onClick?: () => void;
};

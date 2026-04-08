/**
 * Boolean button input plugin.
 *
 * Semantically this is still a boolean binding, not a new state model. The
 * custom part is visual: it presents the binding as a pressable button that can
 * swap content and accent color between the off/on states.
 */
import {
  mergeButtonContent,
  normalizeButtonContent,
  renderButtonContent,
  type ButtonContent,
  type ButtonIcon,
} from './button/buttonContent';
import { createButtonShell } from './button/buttonShell';
import { BUTTON_CONTENT_CSS } from './button/buttonStyles';
import { copyDeclaredUnitState } from './split/domUnitState';

/**
 * Tweakpane readers can see booleans through several primitive shapes. We keep
 * the coercion intentionally tiny and unsurprising.
 */
function boolFromUnknown(value: unknown) {
  if (value === 'false') {
    return false;
  }
  return !!value;
}

/**
 * Writer shape expected by Tweakpane's primitive binding adapter.
 */
function writePrimitive(target: { write: (value: boolean) => void }, value: boolean) {
  target.write(value);
}

type BooleanButtonParams = {
  view: 'boolean-button';
  units: number;
  content: ButtonContent;
  contentOn?: ButtonContent;
  iconSize?: number;
  offColor?: string;
  onColor?: string;
};

const DEFAULT_BOOLEAN_BUTTON_ON_COLOR = '#22d3ee';

class BooleanButtonController {
  public value: any;
  public viewProps: any;
  public view: { element: HTMLElement };
  public buttonEl: HTMLButtonElement;
  private readonly contentHost_: HTMLElement;
  private readonly setState_: (state: { pressed?: boolean; accentColor?: string }) => void;
  private readonly params_: BooleanButtonParams;
  private readonly onClick_: () => void;
  private readonly onValueChange_: () => void;

  constructor(args: {
    document: Document;
    params: BooleanButtonParams;
    value: any;
    viewProps: any;
  }) {
    this.value = args.value;
    this.viewProps = args.viewProps;
    this.params_ = args.params;

    const shell = createButtonShell(args.document, {
      rootClassName: 'tp-boolean-button',
      units: args.params.units,
      iconSize: args.params.iconSize,
    });

    this.view = { element: shell.root };
    this.buttonEl = shell.button;
    this.contentHost_ = shell.contentHost;
    this.setState_ = shell.setState;

    this.onClick_ = () => {
      this.value.rawValue = !this.value.rawValue;
    };
    this.onValueChange_ = () => {
      this.refresh_();
    };

    this.buttonEl.addEventListener('click', this.onClick_);
    this.value.emitter.on('change', this.onValueChange_);
    this.refresh_();

    try { this.viewProps?.handleDispose?.(() => this.dispose()); } catch {}
  }

  dispose() {
    this.buttonEl.removeEventListener('click', this.onClick_);
    this.value.emitter.off('change', this.onValueChange_);
  }

  private refresh_() {
    while (this.contentHost_.firstChild) {
      this.contentHost_.firstChild.remove();
    }

    // The pressed state is derived entirely from the binding value. Visual
    // state therefore remains truthful even when the value changes externally.
    const isOn = !!this.value.rawValue;
    const content = isOn
      ? mergeButtonContent(this.params_.content, this.params_.contentOn)
      : this.params_.content;

    this.contentHost_.appendChild(renderButtonContent(this.contentHost_.ownerDocument, content));
    this.buttonEl.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    this.setState_({
      pressed: isOn,
      accentColor: isOn
        ? (this.params_.onColor ?? DEFAULT_BOOLEAN_BUTTON_ON_COLOR)
        : this.params_.offColor,
    });
  }
}

/**
 * Plugin descriptor for a button-styled boolean binding.
 */
export const BooleanButtonPlugin: any = {
  id: 'boolean-button',
  type: 'input',
  core: { major: 2, minor: 0, patch: 0 },
  css: `
    .tp-boolean-button { width: 100%; box-sizing: border-box; }
    .tp-boolean-button .tp-btnv { width: 100%; }
    .tp-boolean-button .tp-btnv_b {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid transparent;
      transition:
        transform 0.14s ease-out,
        box-shadow 0.16s ease-out,
        background-color 0.16s ease-out,
        background-image 0.16s ease-out,
        border-color 0.16s ease-out,
        filter 0.16s ease-out;
    }
    .tp-boolean-button[data-button-pressed="true"] .tp-btnv_b {
      background-color: var(--tp-btn-accent, ${DEFAULT_BOOLEAN_BUTTON_ON_COLOR});
      background-image: linear-gradient(
        180deg,
        color-mix(in srgb, var(--tp-btn-accent, ${DEFAULT_BOOLEAN_BUTTON_ON_COLOR}) 86%, rgba(255, 255, 255, 0.12)),
        color-mix(in srgb, var(--tp-btn-accent, ${DEFAULT_BOOLEAN_BUTTON_ON_COLOR}) 76%, rgba(0, 0, 0, 0.18))
      );
      border-color: color-mix(in srgb, var(--tp-btn-accent, ${DEFAULT_BOOLEAN_BUTTON_ON_COLOR}) 62%, rgba(0, 0, 0, 0.45));
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.14),
        inset 0 -1px 0 rgba(0, 0, 0, 0.24),
        0 0 0 1px rgba(0, 0, 0, 0.08);
      transform: translateY(1px);
    }
    .tp-boolean-button[data-button-pressed="true"] .tp-btnv_b:hover {
      filter: brightness(1.03) saturate(1.05);
    }
    .tp-boolean-button[data-button-pressed="true"] .tp-btnv_b:focus {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.16),
        inset 0 -1px 0 rgba(0, 0, 0, 0.24),
        0 0 0 1px color-mix(in srgb, var(--tp-btn-accent, ${DEFAULT_BOOLEAN_BUTTON_ON_COLOR}) 35%, rgba(255, 255, 255, 0.28));
    }
    ${BUTTON_CONTENT_CSS}
  `,
  accept(value: unknown, params: any) {
    if (!params || params.view !== 'boolean-button') return null;
    if (typeof value !== 'boolean') return null;

    const content = normalizeButtonContent(params as {
      title?: string;
      icon?: ButtonIcon;
      content?: ButtonContent;
    });
    const contentOn = params.contentOn as ButtonContent | undefined;

    return {
      initialValue: value,
      params: {
        view: 'boolean-button',
        units: Math.max(1, Math.floor(params.units ?? 1)),
        content,
        contentOn,
        iconSize: typeof params.iconSize === 'number' ? params.iconSize : undefined,
        offColor: typeof params.offColor === 'string' ? params.offColor : undefined,
        onColor: typeof params.onColor === 'string' ? params.onColor : undefined,
      } satisfies BooleanButtonParams,
    };
  },
  binding: {
    reader: () => boolFromUnknown,
    writer: () => writePrimitive,
  },
  controller(args: any) {
    return new BooleanButtonController(args);
  },
  api(args: any) {
    if (!(args.controller?.valueController instanceof BooleanButtonController)) return null;
    try {
      // The label controller owns the outer row. We strip its label and copy the
      // declared units up so split-layout sees the same atomic control contract
      // whether it inspects the inner value view or the outer binding wrapper.
      args.controller.labelController?.props?.set('label', null);
      args.controller.buttonEl = args.controller.valueController.buttonEl;
      copyDeclaredUnitState(
        args.controller.valueController.view.element as HTMLElement,
        args.controller.view.element as HTMLElement,
      );
    } catch {}
    return null;
  },
};

export type BooleanButtonOptions = {
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
  contentOn?: ButtonContent;
  iconSize?: number;
  units?: number;
  offColor?: string;
  onColor?: string;
};

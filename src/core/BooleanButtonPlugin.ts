import {
  mergeButtonContent,
  normalizeButtonContent,
  renderButtonContent,
  type ButtonContent,
  type ButtonIcon,
} from './button/buttonContent';
import { createButtonShell } from './button/buttonShell';

function boolFromUnknown(value: unknown) {
  if (value === 'false') {
    return false;
  }
  return !!value;
}

function writePrimitive(target: { write: (value: boolean) => void }, value: boolean) {
  target.write(value);
}

type BooleanButtonParams = {
  view: 'boolean-button';
  units: number;
  content: ButtonContent;
  contentOn?: ButtonContent;
  offColor?: string;
  onColor?: string;
};

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

    const isOn = !!this.value.rawValue;
    const content = isOn
      ? mergeButtonContent(this.params_.content, this.params_.contentOn)
      : this.params_.content;

    this.contentHost_.appendChild(renderButtonContent(this.contentHost_.ownerDocument, content));
    this.setState_({
      pressed: isOn,
      accentColor: isOn ? this.params_.onColor : this.params_.offColor,
    });
  }
}

// Plugin definition
export const BooleanButtonPlugin: any = {
  id: 'boolean-button',
  type: 'input',
  core: { major: 2, minor: 0, patch: 0 },
  css: `
    .tp-boolean-button { width: 100%; box-sizing: border-box; }
    .tp-boolean-button .tp-btnv { width: 100%; }
    .tp-boolean-button .tp-btnv_b { width: 100%; box-sizing: border-box; }
    .tp-boolean-button[data-button-pressed="true"] .tp-btnv_b {
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.22);
      transform: translateY(1px);
    }
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
      args.controller.labelController?.props?.set('label', null);
      args.controller.buttonEl = args.controller.valueController.buttonEl;
    } catch {}
    return null;
  },
};

export type BooleanButtonOptions = {
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
  contentOn?: ButtonContent;
  units?: number;
  offColor?: string;
  onColor?: string;
};

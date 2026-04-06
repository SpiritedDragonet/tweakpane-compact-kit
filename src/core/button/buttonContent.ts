/**
 * Shared button content model.
 *
 * Both sized buttons and boolean buttons accept a slightly richer content
 * description than native Tweakpane buttons. Keeping the normalization and DOM
 * rendering here prevents the plugins from duplicating icon/title glue code.
 */
export type ButtonIcon =
  | string
  | {path: string; viewBox?: string};

export type ButtonContent = {
  text?: string;
  icon?: ButtonIcon;
};

type ButtonContentInput = {
  title?: string;
  icon?: ButtonIcon;
  content?: ButtonContent;
};

function normalizeIcon(icon: ButtonIcon | undefined): ButtonIcon | undefined {
  if (!icon) return undefined;
  if (typeof icon === 'string') return icon;
  return {
    path: icon.path,
    viewBox: icon.viewBox,
  };
}

/**
 * Collapses the public shorthands (`title`, `icon`) into the single internal
 * content shape used by the renderers.
 */
export function normalizeButtonContent(input: ButtonContentInput): ButtonContent {
  return {
    text: input.content?.text ?? input.title ?? '',
    icon: normalizeIcon(input.content?.icon ?? input.icon),
  };
}

/**
 * Builds the "pressed" variant for boolean buttons without mutating the base
 * content definition.
 */
export function mergeButtonContent(
  base: ButtonContent,
  override?: ButtonContent,
): ButtonContent {
  return {
    text: override?.text ?? base.text,
    icon: normalizeIcon(override?.icon ?? base.icon),
  };
}

function renderButtonIcon(doc: Document, icon: ButtonIcon): SVGSVGElement {
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  const viewBox = typeof icon === 'string' ? '0 0 16 16' : icon.viewBox ?? '0 0 16 16';
  const pathData = typeof icon === 'string' ? icon : icon.path;

  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', pathData);
  svg.appendChild(path);
  return svg;
}

/**
 * Renders a compact inline icon/text cluster that can be dropped into the
 * standard Tweakpane button markup.
 */
export function renderButtonContent(
  doc: Document,
  content: ButtonContent,
): HTMLElement {
  const root = doc.createElement('span');
  root.className = 'tp-btnc';

  if (content.icon) {
    const icon = renderButtonIcon(doc, content.icon);
    icon.classList.add('tp-btnc_i');
    root.appendChild(icon);
  }

  if (content.text) {
    const text = doc.createElement('span');
    text.className = 'tp-btnc_t';
    text.textContent = content.text;
    root.appendChild(text);
  }

  return root;
}

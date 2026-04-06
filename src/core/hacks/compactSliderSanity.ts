/**
 * Geometry sanity checks for the compact slider patch.
 *
 * The patch intentionally repositions several native slider sub-elements. These
 * helpers let the patch verify "still looks structurally sane" using simple
 * rectangles instead of screenshot comparisons.
 */
export type CompactRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type CompactLayoutMetrics = {
  labeledView: CompactRect;
  title: CompactRect;
  valueBox: CompactRect;
  valueText: CompactRect;
  sliderTrack: CompactRect;
};

const EPSILON_PX = 1;

function width(rect: CompactRect): number {
  return Math.max(0, rect.right - rect.left);
}

function height(rect: CompactRect): number {
  return Math.max(0, rect.bottom - rect.top);
}

function area(rect: CompactRect): number {
  return width(rect) * height(rect);
}

function intersectionArea(a: CompactRect, b: CompactRect): number {
  const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return overlapWidth * overlapHeight;
}

/**
 * Confirms that a child rectangle stays visually inside its expected host.
 */
function assertInside(name: string, inner: CompactRect, outer: CompactRect) {
  if (inner.left < outer.left - EPSILON_PX || inner.right > outer.right + EPSILON_PX) {
    throw new Error(`${name} escapes its horizontal bounds`);
  }
  if (inner.top < outer.top - EPSILON_PX || inner.bottom > outer.bottom + EPSILON_PX) {
    throw new Error(`${name} escapes its vertical bounds`);
  }
}

function readRect(el: HTMLElement): CompactRect {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Returns `true` only when every tracked rectangle has a positive renderable
 * area. Hidden or zero-sized controls are ignored by the patch.
 */
export function isRenderableCompactLayout(metrics: CompactLayoutMetrics): boolean {
  return [
    metrics.labeledView,
    metrics.title,
    metrics.valueBox,
    metrics.valueText,
    metrics.sliderTrack,
  ].every((rect) => width(rect) > 0 && height(rect) > 0);
}

/**
 * Applies a deliberately small set of layout heuristics:
 * - title stays in the upper-left region
 * - value text stays on the right side
 * - the compressed track does not run through the value text
 */
export function assertCompactLayoutSane(metrics: CompactLayoutMetrics): void {
  assertInside('title', metrics.title, metrics.labeledView);
  assertInside('value text', metrics.valueText, metrics.valueBox);

  const labeledWidth = width(metrics.labeledView);
  const labeledHeight = height(metrics.labeledView);
  const valueWidth = width(metrics.valueBox);

  if (metrics.title.left > metrics.labeledView.left + labeledWidth * 0.45) {
    throw new Error('title is not kept in the left-side region');
  }
  if (metrics.title.bottom > metrics.labeledView.top + labeledHeight * 0.55) {
    throw new Error('title is not kept in the upper region');
  }
  if (metrics.valueText.left < metrics.valueBox.left + valueWidth * 0.45) {
    throw new Error('value text is not kept on the right side');
  }

  const overlapRatio = intersectionArea(metrics.sliderTrack, metrics.valueText) / Math.max(1, area(metrics.valueText));
  if (overlapRatio > 0.2) {
    throw new Error('slider track overlaps the value text');
  }
}

/**
 * Pulls the few rectangles we care about out of the native slider DOM.
 */
export function collectCompactLayoutMetrics(labeledView: HTMLElement): CompactLayoutMetrics | null {
  const title = labeledView.querySelector('.tp-lblv_l') as HTMLElement | null;
  const valueBox = labeledView.querySelector('.tp-lblv_v') as HTMLElement | null;
  const textArea = labeledView.querySelector('.tp-sldtxtv_t') as HTMLElement | null;
  const valueText = (textArea?.querySelector('input') as HTMLElement | null) ?? textArea;
  const sliderTrack = (labeledView.querySelector('.tp-sldtxtv_s') as HTMLElement | null)
    ?? (labeledView.querySelector('.tp-sldv_s') as HTMLElement | null);

  if (!title || !valueBox || !valueText || !sliderTrack) {
    return null;
  }

  return {
    labeledView: readRect(labeledView),
    title: readRect(title),
    valueBox: readRect(valueBox),
    valueText: readRect(valueText),
    sliderTrack: readRect(sliderTrack),
  };
}

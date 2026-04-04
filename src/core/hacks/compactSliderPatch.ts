import {
  assertCompactLayoutSane,
  collectCompactLayoutMetrics,
  isRenderableCompactLayout,
  type CompactLayoutMetrics,
} from './compactSliderSanity';

export type CompactSliderOptions = {
  enabled?: boolean;
  hideLabels?: boolean;
  checkSanity?: boolean;
  onMetrics?: (metrics: CompactLayoutMetrics) => void;
  onSanityError?: (error: Error, metrics: CompactLayoutMetrics) => void;
};

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function maybeReportMetrics(labeledView: HTMLElement, options: CompactSliderOptions) {
  if (!options.onMetrics && !options.checkSanity && !options.onSanityError) {
    return;
  }

  const metrics = collectCompactLayoutMetrics(labeledView);
  if (!metrics || !isRenderableCompactLayout(metrics)) {
    return;
  }

  options.onMetrics?.(metrics);

  if (!options.checkSanity) {
    return;
  }

  try {
    assertCompactLayoutSane(metrics);
  } catch (error) {
    if (options.onSanityError) {
      options.onSanityError(toError(error), metrics);
      return;
    }
    throw error;
  }
}

export function installCompactSliderPatch(
  container: HTMLElement,
  options: CompactSliderOptions = {},
): () => void {
  if (options.enabled === false) {
    return () => {};
  }

  const observers: MutationObserver[] = [];
  const tweakedSet = new WeakSet<HTMLElement>();

  const tweakSliderLabel = (labeledView: HTMLElement) => {
    try {
      if (!labeledView.classList?.contains('tp-lblv')) return;
      if (tweakedSet.has(labeledView)) {
        maybeReportMetrics(labeledView, options);
        return;
      }

      const valueBox = labeledView.querySelector('.tp-lblv_v') as HTMLElement | null;
      if (!valueBox) return;

      const hasSlider = !!(valueBox.querySelector('.tp-sldv') || valueBox.querySelector('.tp-sldtxtv'));
      const labelBox = labeledView.querySelector('.tp-lblv_l') as HTMLElement | null;

      tweakedSet.add(labeledView);

      if (hasSlider) {
        const sliderSurface = (valueBox.querySelector('.tp-sldtxtv_s') as HTMLElement | null)
          ?? (valueBox.querySelector('.tp-sldv_s') as HTMLElement | null);

        if (sliderSurface) {
          sliderSurface.style.transformOrigin = 'bottom left';
          sliderSurface.style.transform = 'scaleY(0.5)';
          (sliderSurface.style as CSSStyleDeclaration & { willChange?: string }).willChange = 'transform';

          const handle = (sliderSurface.querySelector('.tp-sldv_h') as HTMLElement | null)
            ?? (sliderSurface.querySelector('[class*="sldv_h"]') as HTMLElement | null)
            ?? (sliderSurface.querySelector('[class*="knob"]') as HTMLElement | null)
            ?? (sliderSurface.querySelector('[class*="handle"]') as HTMLElement | null)
            ?? (sliderSurface.querySelector('[class*="thumb"]') as HTMLElement | null);

          if (handle) {
            handle.style.display = 'none';
          }
        }

        const textArea = valueBox.querySelector('.tp-sldtxtv_t') as HTMLElement | null;
        if (textArea) {
          try {
            valueBox.appendChild(textArea);
          } catch {}

          textArea.style.position = 'absolute';
          textArea.style.right = '6px';
          textArea.style.top = '2px';
          textArea.style.transformOrigin = 'top right';
          textArea.style.transform = 'scale(0.3333, 0.5)';
          (textArea.style as CSSStyleDeclaration & { willChange?: string }).willChange = 'transform';
          textArea.style.zIndex = '1';

          const inputEl = textArea.querySelector('input') as HTMLElement | null;
          if (inputEl) {
            inputEl.style.fontSize = '24px';
            inputEl.style.fontWeight = '';
            inputEl.style.lineHeight = '1';
            inputEl.style.fontFamily = '';
            inputEl.style.letterSpacing = '0.01em';
          }
        }
      }

      const labelStillVisible = !!(labelBox && (!options.hideLabels || labelBox.isConnected));
      if (labelBox && labelStillVisible && hasSlider) {
        labelBox.style.position = 'absolute';
        labelBox.style.left = '6px';
        labelBox.style.top = '4px';
        labelBox.style.fontSize = '10px';
        labelBox.style.lineHeight = '1';
        labelBox.style.margin = '0';
        labelBox.style.padding = '0';
        labelBox.style.maxWidth = '60%';
        labelBox.style.overflow = 'hidden';
        labelBox.style.textOverflow = 'ellipsis';
        labelBox.style.whiteSpace = 'nowrap';
        labelBox.style.paddingRight = '4px';
        labelBox.style.background = 'transparent';
        labelBox.style.zIndex = '1';

        try {
          valueBox.insertBefore(labelBox, valueBox.firstChild);
        } catch {}
      }

      maybeReportMetrics(labeledView, options);
    } catch {}
  };

  const patchAll = (root: HTMLElement) => {
    const labeled = root.querySelectorAll('.tp-lblv');
    labeled.forEach((labeledView) => tweakSliderLabel(labeledView as HTMLElement));
  };

  patchAll(container);

  const observer = new MutationObserver(() => patchAll(container));
  observer.observe(container, { childList: true, subtree: true });
  observers.push(observer);

  return () => {
    observers.forEach((entry) => {
      try {
        entry.disconnect();
      } catch {}
    });
  };
}

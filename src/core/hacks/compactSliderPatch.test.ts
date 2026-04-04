import { describe, expect, it, vi } from 'vitest';

import { installCompactSliderPatch } from './compactSliderPatch';
import { assertCompactLayoutSane } from './compactSliderSanity';

type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

function setRect(el: HTMLElement, rect: RectLike) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      toJSON: () => rect,
    }),
  });
}

function createSliderDom() {
  document.body.innerHTML = '';

  const root = document.createElement('div');
  const labeledView = document.createElement('div');
  labeledView.className = 'tp-lblv';

  const labelBox = document.createElement('div');
  labelBox.className = 'tp-lblv_l';
  labelBox.textContent = 'Gain';

  const valueBox = document.createElement('div');
  valueBox.className = 'tp-lblv_v';

  const slider = document.createElement('div');
  slider.className = 'tp-sldtxtv';

  const sliderSurface = document.createElement('div');
  sliderSurface.className = 'tp-sldtxtv_s';

  const handle = document.createElement('div');
  handle.className = 'tp-sldv_h';
  sliderSurface.appendChild(handle);

  const textArea = document.createElement('div');
  textArea.className = 'tp-sldtxtv_t';

  const input = document.createElement('input');
  input.value = '42';
  textArea.appendChild(input);

  slider.appendChild(sliderSurface);
  slider.appendChild(textArea);
  valueBox.appendChild(slider);
  labeledView.appendChild(labelBox);
  labeledView.appendChild(valueBox);
  root.appendChild(labeledView);
  document.body.appendChild(root);

  return {
    root,
    labeledView,
    labelBox,
    valueBox,
    sliderSurface,
    handle,
    textArea,
    input,
  };
}

describe('compactSlider sanity', () => {
  it('keeps title, value text, and slider track in sane relative bounds', () => {
    expect(() =>
      assertCompactLayoutSane({
        labeledView: { left: 0, top: 0, right: 240, bottom: 36 },
        title: { left: 6, top: 4, right: 90, bottom: 14 },
        valueBox: { left: 80, top: 0, right: 240, bottom: 36 },
        valueText: { left: 180, top: 2, right: 230, bottom: 14 },
        sliderTrack: { left: 82, top: 18, right: 236, bottom: 30 },
      }),
    ).not.toThrow();
  });

  it('rejects value text that spills outside the value box', () => {
    expect(() =>
      assertCompactLayoutSane({
        labeledView: { left: 0, top: 0, right: 240, bottom: 36 },
        title: { left: 6, top: 4, right: 90, bottom: 14 },
        valueBox: { left: 80, top: 0, right: 200, bottom: 36 },
        valueText: { left: 190, top: 2, right: 230, bottom: 14 },
        sliderTrack: { left: 82, top: 18, right: 196, bottom: 30 },
      }),
    ).toThrow(/value/i);
  });
});

describe('installCompactSliderPatch', () => {
  it('patches slider DOM and reports sane geometry when measurable', () => {
    const dom = createSliderDom();
    const onMetrics = vi.fn();

    setRect(dom.labeledView, { left: 0, top: 0, right: 240, bottom: 36 });
    setRect(dom.labelBox, { left: 6, top: 4, right: 90, bottom: 14 });
    setRect(dom.valueBox, { left: 80, top: 0, right: 240, bottom: 36 });
    setRect(dom.input, { left: 180, top: 2, right: 230, bottom: 14 });
    setRect(dom.sliderSurface, { left: 82, top: 18, right: 236, bottom: 30 });

    const cleanup = installCompactSliderPatch(dom.root, {
      enabled: true,
      checkSanity: true,
      onMetrics,
    });

    expect(dom.labelBox.parentElement).toBe(dom.valueBox);
    expect(dom.labelBox.style.position).toBe('absolute');
    expect(dom.labelBox.style.left).toBe('6px');
    expect(dom.textArea.parentElement).toBe(dom.valueBox);
    expect(dom.textArea.style.right).toBe('6px');
    expect(dom.sliderSurface.style.transform).toBe('scaleY(0.5)');
    expect(dom.handle.style.display).toBe('none');
    expect(onMetrics).toHaveBeenCalledTimes(1);

    cleanup();
  });
});

import { describe, expect, it } from 'vitest';

import {
  mergeButtonContent,
  normalizeButtonContent,
  renderButtonContent,
} from './buttonContent';

describe('normalizeButtonContent', () => {
  it('maps title and top-level icon into shared content', () => {
    expect(
      normalizeButtonContent({
        title: 'Monitor\nGraph',
        icon: {path: 'M1 1L15 15'},
      }),
    ).toEqual({
      text: 'Monitor\nGraph',
      icon: {path: 'M1 1L15 15'},
    });
  });
});

describe('mergeButtonContent', () => {
  it('lets on-state content inherit missing fields from the base state', () => {
    expect(
      mergeButtonContent(
        {text: 'Compact', icon: {path: 'M3 8h10'}},
        {text: 'Compact On'},
      ),
    ).toEqual({
      text: 'Compact On',
      icon: {path: 'M3 8h10'},
    });
  });
});

describe('renderButtonContent', () => {
  it('renders a stable mixed icon-text structure', () => {
    const el = renderButtonContent(document, {
      text: 'Compact Sliders',
      icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
    });

    expect(el.classList.contains('tp-btnc-mixed')).toBe(true);
    expect(el.querySelector('.tp-btnc_ir')).not.toBeNull();
    expect(el.querySelector('.tp-btnc_tr')).not.toBeNull();
    expect(el.querySelector('.tp-btnc_gh')).not.toBeNull();
    expect(el.querySelector('.tp-btnc_iw svg')).not.toBeNull();
    expect(el.querySelector('.tp-btnc_tw')?.textContent).toBe('Compact Sliders');
  });

  it('renders text-only content without an icon rail payload', () => {
    const el = renderButtonContent(document, {
      text: 'Run Action',
    });

    expect(el.classList.contains('tp-btnc-text')).toBe(true);
    expect(el.querySelector('.tp-btnc_iw')).toBeNull();
    expect(el.querySelector('.tp-btnc_tw')?.textContent).toBe('Run Action');
  });

  it('renders icon-only content without a text rail payload', () => {
    const el = renderButtonContent(document, {
      icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
    });

    expect(el.classList.contains('tp-btnc-icon')).toBe(true);
    expect(el.querySelector('.tp-btnc_tw')).toBeNull();
    expect(el.querySelector('.tp-btnc_iw svg')).not.toBeNull();
  });
});

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
  it('renders icon + text without custom user DOM', () => {
    const el = renderButtonContent(document, {
      text: 'Compact Sliders',
      icon: {path: 'M3 8h10', viewBox: '0 0 16 16'},
    });

    expect(el.querySelector('svg')).not.toBeNull();
    expect(el.textContent).toContain('Compact Sliders');
  });
});

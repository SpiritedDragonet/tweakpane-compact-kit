import { describe, expect, it } from 'vitest';

import { BUTTON_CONTENT_CSS } from './buttonStyles';

describe('BUTTON_CONTENT_CSS', () => {
  it('anchors mixed icon-text buttons to the full button box instead of label width', () => {
    expect(BUTTON_CONTENT_CSS).toContain('position: relative;');
    expect(BUTTON_CONTENT_CSS).toContain('height: 100%;');
    expect(BUTTON_CONTENT_CSS).toContain('--tp-btnc-anchor:');
    expect(BUTTON_CONTENT_CSS).toContain('left: var(--tp-btnc-anchor);');
    expect(BUTTON_CONTENT_CSS).toContain('transform: translate(-50%, -50%);');
    expect(BUTTON_CONTENT_CSS).toContain('--tp-btnc-text-pad-start:');
    expect(BUTTON_CONTENT_CSS).toContain('--tp-btnc-text-pad-end:');
    expect(BUTTON_CONTENT_CSS).toContain('padding-inline-start: var(--tp-btnc-text-pad-start);');
    expect(BUTTON_CONTENT_CSS).toContain('padding-inline-end: var(--tp-btnc-text-pad-end);');
    expect(BUTTON_CONTENT_CSS).toContain('line-height: 1.05;');
    expect(BUTTON_CONTENT_CSS).toContain('overflow-wrap: anywhere;');
    expect(BUTTON_CONTENT_CSS).toContain('width: 100%;');
    expect(BUTTON_CONTENT_CSS).not.toContain('display: grid;');
    expect(BUTTON_CONTENT_CSS).not.toContain('grid-template-columns:');
  });
});

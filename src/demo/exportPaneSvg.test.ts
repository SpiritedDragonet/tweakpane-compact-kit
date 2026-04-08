import { describe, expect, it } from 'vitest';

import { buildPaneSvgDocument, collectShowcaseSvgExports, toExportFileName } from './exportPaneSvg';

describe('buildPaneSvgDocument', () => {
  it('wraps serialized pane markup in a standalone svg document', () => {
    const host = document.createElement('div');
    host.style.width = '320px';
    host.style.height = '120px';
    host.innerHTML = '<div class="pane">demo</div>';

    const svg = buildPaneSvgDocument(document, host, {
      width: 320,
      height: 120,
      cssText: '.pane { color: white; }',
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('<foreignObject');
    expect(svg).toContain('.pane { color: white; }');
    expect(svg).toContain('class="pane"');
  });

  it('keeps foreignObject content XML-safe when the pane contains void HTML elements', () => {
    const host = document.createElement('div');
    host.innerHTML = '<label class="row"><input type="text" value="42"></label>';

    const svg = buildPaneSvgDocument(document, host, {
      width: 320,
      height: 120,
      cssText: '.row { display: block; }',
    });

    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
  });

  it('serializes live form values instead of stale HTML attributes', () => {
    const host = document.createElement('div');
    host.innerHTML = `
      <label class="row">
        <input type="text" value="42">
        <textarea>alpha</textarea>
        <select>
          <option value="a" selected>A</option>
          <option value="b">B</option>
        </select>
      </label>
    `;

    const input = host.querySelector('input') as HTMLInputElement;
    const textarea = host.querySelector('textarea') as HTMLTextAreaElement;
    const select = host.querySelector('select') as HTMLSelectElement;

    input.value = '57';
    textarea.value = 'beta';
    select.value = 'b';

    const svg = buildPaneSvgDocument(document, host, {
      width: 320,
      height: 120,
      cssText: '.row { display: block; }',
    });

    expect(svg).toContain('value="57"');
    expect(svg).toContain('>beta</textarea>');
    expect(svg).toContain('<option value="b" selected="">B</option>');
    expect(svg).not.toContain('<option value="a" selected="">A</option>');
  });

  it('uses the target scroll height when content exceeds the host baseline height', () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="pane">demo</div>';
    host.getBoundingClientRect = () =>
      ({
        width: 320,
        height: 120,
      }) as DOMRect;

    Object.defineProperty(host, 'clientWidth', {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(host, 'offsetWidth', {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(host, 'scrollWidth', {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(host, 'clientHeight', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(host, 'offsetHeight', {
      configurable: true,
      value: 120,
    });
    Object.defineProperty(host, 'scrollHeight', {
      configurable: true,
      value: 220,
    });

    const [result] = collectShowcaseSvgExports(document, new Map([['demo', host]]));

    expect(result.height).toBe(220);
    expect(result.svgText).toContain('height="220"');
  });
});

describe('toExportFileName', () => {
  it('maps a showcase export key to the committed svg file name', () => {
    expect(toExportFileName('compact-sliders-on')).toBe('compact-sliders-on.svg');
  });
});

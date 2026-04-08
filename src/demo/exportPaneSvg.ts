export type PaneSvgOptions = {
  width: number;
  height: number;
  cssText: string;
};

export type ShowcaseSvgExport = {
  key: string;
  fileName: string;
  width: number;
  height: number;
  svgText: string;
};

export type ShowcaseExportApi = {
  listTargets: () => string[];
  export: (key: string, options?: { download?: boolean }) => Promise<ShowcaseSvgExport>;
  exportAll: (options?: { download?: boolean }) => Promise<ShowcaseSvgExport[]>;
};

function formatDimension(value: number) {
  return Math.max(1, Math.round(value));
}

function cloneTargetForExport(target: HTMLElement, width: number, height: number) {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.boxSizing = 'border-box';
  clone.style.margin = '0';
  syncLiveFormState(target, clone);
  return clone;
}

function syncLiveFormState(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sourceFields = sourceRoot.querySelectorAll('input, textarea, select');
  const cloneFields = cloneRoot.querySelectorAll('input, textarea, select');

  sourceFields.forEach((sourceField, index) => {
    const cloneField = cloneFields[index];
    if (!cloneField) {
      return;
    }

    if (sourceField instanceof HTMLInputElement && cloneField instanceof HTMLInputElement) {
      cloneField.value = sourceField.value;
      cloneField.setAttribute('value', sourceField.value);

      if (sourceField.checked) {
        cloneField.setAttribute('checked', '');
      } else {
        cloneField.removeAttribute('checked');
      }
      return;
    }

    if (sourceField instanceof HTMLTextAreaElement && cloneField instanceof HTMLTextAreaElement) {
      cloneField.value = sourceField.value;
      cloneField.textContent = sourceField.value;
      return;
    }

    if (sourceField instanceof HTMLSelectElement && cloneField instanceof HTMLSelectElement) {
      cloneField.value = sourceField.value;
      Array.from(cloneField.options).forEach((cloneOption, optionIndex) => {
        const sourceOption = sourceField.options[optionIndex];
        if (sourceOption?.selected) {
          cloneOption.setAttribute('selected', '');
        } else {
          cloneOption.removeAttribute('selected');
        }
      });
    }
  });
}

function serializeForeignObjectMarkup(
  doc: Document,
  target: HTMLElement,
  options: PaneSvgOptions,
) {
  const xhtmlDoc = doc.implementation.createDocument('http://www.w3.org/1999/xhtml', 'div');
  const wrapper = xhtmlDoc.documentElement;

  const style = xhtmlDoc.createElement('style');
  style.textContent = options.cssText;
  wrapper.appendChild(style);

  const importedTarget = xhtmlDoc.importNode(
    cloneTargetForExport(target, formatDimension(options.width), formatDimension(options.height)),
    true,
  );
  wrapper.appendChild(importedTarget);

  return new XMLSerializer().serializeToString(wrapper);
}

function serializeAccessibleCss(doc: Document) {
  const chunks: string[] = [];
  Array.from(doc.styleSheets).forEach((sheet) => {
    try {
      const rules = Array.from(sheet.cssRules).map((rule) => rule.cssText);
      if (rules.length > 0) {
        chunks.push(rules.join('\n'));
      }
    } catch {}
  });
  return chunks.join('\n');
}

function measureTarget(target: HTMLElement) {
  const rect = target.getBoundingClientRect();
  const width = Math.max(
    rect.width,
    target.clientWidth,
    target.offsetWidth,
    target.scrollWidth,
    1,
  );
  const height = Math.max(
    rect.height,
    target.clientHeight,
    target.offsetHeight,
    target.scrollHeight,
    1,
  );
  return {
    width: formatDimension(width),
    height: formatDimension(height),
  };
}

function triggerSvgDownload(doc: Document, fileName: string, svgText: string) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = fileName;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function toExportFileName(exportKey: string) {
  return exportKey.endsWith('.svg') ? exportKey : `${exportKey}.svg`;
}

// The export format is plain SVG with one foreignObject payload. That keeps the
// output readable, reproducible, and close to what GitHub can render from a
// committed file without extra tooling.
export function buildPaneSvgDocument(
  doc: Document,
  target: HTMLElement,
  options: PaneSvgOptions,
) {
  const width = formatDimension(options.width);
  const height = formatDimension(options.height);
  const markup = serializeForeignObjectMarkup(doc, target, options);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <foreignObject x="0" y="0" width="${width}" height="${height}">`,
    `    ${markup}`,
    '  </foreignObject>',
    '</svg>',
  ].join('\n');
}

function buildShowcaseSvgExport(doc: Document, key: string, target: HTMLElement): ShowcaseSvgExport {
  const { width, height } = measureTarget(target);
  const svgText = buildPaneSvgDocument(doc, target, {
    width,
    height,
    cssText: serializeAccessibleCss(doc),
  });

  return {
    key,
    fileName: toExportFileName(key),
    width,
    height,
    svgText,
  };
}

export function collectShowcaseSvgExports(
  doc: Document,
  exportTargets: Map<string, HTMLElement>,
) {
  return Array.from(exportTargets.entries()).map(([key, target]) =>
    buildShowcaseSvgExport(doc, key, target),
  );
}

declare global {
  interface Window {
    __compactKitShowcase?: ShowcaseExportApi;
  }
}

export function installShowcaseExportApi(args: {
  doc: Document;
  win: Window;
  exportTargets: Map<string, HTMLElement>;
}) {
  const { doc, win, exportTargets } = args;

  const api: ShowcaseExportApi = {
    listTargets: () => Array.from(exportTargets.keys()),
    export: async (key, options) => {
      const target = exportTargets.get(key);
      if (!target) {
        throw new Error(`Unknown showcase export target: ${key}`);
      }

      const result = buildShowcaseSvgExport(doc, key, target);
      if (options?.download !== false) {
        triggerSvgDownload(doc, result.fileName, result.svgText);
      }
      return result;
    },
    exportAll: async (options) => {
      const results = collectShowcaseSvgExports(doc, exportTargets);
      if (options?.download !== false) {
        results.forEach((result) => {
          triggerSvgDownload(doc, result.fileName, result.svgText);
        });
      }
      return results;
    },
  };

  win.__compactKitShowcase = api;

  return () => {
    if (win.__compactKitShowcase === api) {
      delete win.__compactKitShowcase;
    }
  };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export type DonutGaugeSvgOptions = {
  color?: string;
  thickness?: number;
  rounded?: boolean;
};

export type DonutGaugeSvgParams = DonutGaugeSvgOptions & {
  width: number;
  height: number;
  value: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function createSvgNode<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tagName: K,
): SVGElementTagNameMap[K] {
  return doc.createElementNS(SVG_NS, tagName);
}

export function createDonutGaugeSvg(
  doc: Document,
  params: DonutGaugeSvgParams,
): SVGSVGElement {
  const width = Math.max(1, params.width);
  const height = Math.max(1, params.height);
  const value = clamp(params.value, 0, 100);
  const color = params.color ?? '#22d3ee';
  const thickness = clamp(Math.floor(params.thickness ?? 10), 2, 24);
  const rounded = !!params.rounded;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(8, Math.min(cx, cy) - thickness);
  const circumference = Math.PI * 2 * radius;
  const progress = circumference * (value / 100);

  const svg = createSvgNode(doc, 'svg');
  svg.setAttribute('viewBox', `0 0 ${formatNumber(width)} ${formatNumber(height)}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';

  const track = createSvgNode(doc, 'circle');
  track.dataset.gaugeTrack = 'true';
  track.setAttribute('cx', formatNumber(cx));
  track.setAttribute('cy', formatNumber(cy));
  track.setAttribute('r', formatNumber(radius));
  track.setAttribute('fill', 'none');
  track.setAttribute('stroke', 'rgba(255,255,255,0.08)');
  track.setAttribute('stroke-width', String(thickness));
  track.setAttribute('stroke-linecap', rounded ? 'round' : 'butt');

  const arc = createSvgNode(doc, 'circle');
  arc.dataset.gaugeArc = 'true';
  arc.setAttribute('cx', formatNumber(cx));
  arc.setAttribute('cy', formatNumber(cy));
  arc.setAttribute('r', formatNumber(radius));
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', color);
  arc.setAttribute('stroke-width', String(thickness));
  arc.setAttribute('stroke-linecap', rounded ? 'round' : 'butt');
  arc.setAttribute(
    'stroke-dasharray',
    `${formatNumber(progress)} ${formatNumber(Math.max(0, circumference - progress))}`,
  );
  arc.setAttribute('transform', `rotate(-90 ${formatNumber(cx)} ${formatNumber(cy)})`);

  const label = createSvgNode(doc, 'text');
  label.dataset.gaugeLabel = 'true';
  label.setAttribute('x', formatNumber(cx));
  label.setAttribute('y', formatNumber(cy));
  label.setAttribute('fill', '#e5e7eb');
  label.setAttribute('font-size', formatNumber(Math.min(width, height) * 0.28));
  label.setAttribute('font-family', 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('alignment-baseline', 'middle');
  label.textContent = `${Math.round(value)}%`;

  svg.append(track, arc, label);
  return svg;
}

export function renderDonutGaugeSvg(
  container: HTMLElement,
  value: number,
  options?: DonutGaugeSvgOptions,
) {
  const rect = container.getBoundingClientRect();
  container.innerHTML = '';
  container.appendChild(createDonutGaugeSvg(container.ownerDocument, {
    width: rect.width,
    height: rect.height,
    value,
    ...options,
  }));
}

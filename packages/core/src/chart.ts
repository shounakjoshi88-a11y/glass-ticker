/** SVG line chart with a gradient fill, gridlines and a hover crosshair. */

export interface ChartOptions {
  points: Array<[number, number]>;
  previousClose: number | null;
  currency: string | null;
  range: string;
  upColor: string;
  downColor: string;
}

interface Geometry {
  points: Array<[number, number]>;
  xAt: (index: number) => number;
  yAt: (value: number) => number;
  padL: number;
  padT: number;
  plotW: number;
  plotH: number;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name: string, attributes: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

export function formatNumber(value: number | null, places = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '--';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

export function formatCurrency(value: number | null, currency: string | null, places = 2): string {
  if (value === null || value === undefined) return '--';
  const symbol =
    { USD: '$', INR: '₹', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥', KRW: '₩', CAD: 'C$', AUD: 'A$' }[
      (currency || '').toUpperCase()
    ] || '';
  return symbol + formatNumber(value, places);
}

export function formatPercent(value: number | null, places = 2): string {
  if (value === null || value === undefined) return '--';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatNumber(Math.abs(value), places)}%`;
}

/** Fewer decimals for big numbers so axis labels do not collide. */
function axisNumber(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1000) return formatNumber(value, 0);
  if (magnitude >= 100) return formatNumber(value, 1);
  return formatNumber(value, 2);
}

function stampLabel(epochSeconds: number, range: string): string {
  const date = new Date(epochSeconds * 1000);
  if (range === '1D' || range === '5D') {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (range === '5Y' || range === 'MAX') return String(date.getFullYear());
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

let gradientCounter = 0;

export function renderChart(container: HTMLElement, options: ChartOptions): Geometry | null {
  const points = options.points ?? [];
  container.innerHTML = '';
  if (!points.length) {
    const empty = document.createElement('div');
    empty.className = 'gt-empty';
    empty.textContent = 'No data';
    container.appendChild(empty);
    return null;
  }

  const width = container.clientWidth || 480;
  const height = container.clientHeight || 240;
  const padL = 6;
  const padR = width < 340 ? 44 : 56;
  const padT = 10;
  const padB = 20;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = Math.max(10, height - padT - padB);

  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    if (point[1] < min) min = point[1];
    if (point[1] > max) max = point[1];
  }
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const lo = min - span * 0.14;
  const hi = max + span * 0.14;

  const xAt = (index: number) =>
    padL + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const yAt = (value: number) => padT + plotH - ((value - lo) / (hi - lo)) * plotH;

  const first = points[0][1];
  const last = points[points.length - 1][1];
  const reference = options.previousClose ?? first;
  const rising = last >= reference;
  const colour = rising ? options.upColor : options.downColor;

  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height });

  const gradientId = `gt-grad-${(gradientCounter += 1)}`;
  const defs = el('defs', {});
  const gradient = el('linearGradient', { id: gradientId, x1: '0', y1: '0', x2: '0', y2: '1' });
  gradient.appendChild(el('stop', { offset: '0%', 'stop-color': colour, 'stop-opacity': '0.28' }));
  gradient.appendChild(el('stop', { offset: '100%', 'stop-color': colour, 'stop-opacity': '0' }));
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const gridCount = 5;
  for (let index = 0; index < gridCount; index += 1) {
    const value = lo + ((hi - lo) * index) / (gridCount - 1);
    const y = yAt(value);
    svg.appendChild(
      el('line', { class: 'gt-grid', x1: padL, y1: y, x2: padL + plotW, y2: y })
    );
    const label = el('text', {
      class: 'gt-label',
      x: padL + plotW + 7,
      y: y + 3,
    });
    label.textContent = axisNumber(value);
    svg.appendChild(label);
  }

  let line = '';
  for (let index = 0; index < points.length; index += 1) {
    line += `${index === 0 ? 'M' : 'L'}${xAt(index).toFixed(2)} ${yAt(points[index][1]).toFixed(2)}`;
  }
  const area = `${line}L${xAt(points.length - 1).toFixed(2)} ${(padT + plotH).toFixed(2)}L${xAt(0).toFixed(
    2
  )} ${(padT + plotH).toFixed(2)}Z`;

  svg.appendChild(el('path', { d: area, fill: `url(#${gradientId})` }));
  svg.appendChild(
    el('path', {
      d: line,
      fill: 'none',
      stroke: colour,
      'stroke-width': '1.8',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
    })
  );

  const labelCount = Math.min(4, points.length);
  for (let index = 0; index < labelCount; index += 1) {
    const pointIndex = Math.round((index * (points.length - 1)) / Math.max(1, labelCount - 1));
    const anchor = index === 0 ? 'start' : index === labelCount - 1 ? 'end' : 'middle';
    const label = el('text', {
      class: 'gt-label',
      x: xAt(pointIndex),
      y: padT + plotH + 14,
      'text-anchor': anchor,
    });
    label.textContent = stampLabel(points[pointIndex][0], options.range);
    svg.appendChild(label);
  }

  const lastX = xAt(points.length - 1);
  const lastY = yAt(last);
  svg.appendChild(el('circle', { cx: lastX, cy: lastY, r: 6, fill: colour, opacity: '0.2' }));
  svg.appendChild(el('circle', { cx: lastX, cy: lastY, r: 3, fill: colour }));

  container.appendChild(svg);

  const geometry: Geometry = { points, xAt, yAt, padL, padT, plotW, plotH };

  const crosshair = el('line', { class: 'gt-cross', y1: padT, y2: padT + plotH, x1: 0, x2: 0 });
  crosshair.style.display = 'none';
  svg.appendChild(crosshair);

  const tip = document.createElement('div');
  tip.className = 'gt-tip';
  tip.style.display = 'none';
  container.appendChild(tip);

  const onMove = (event: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    if (x < padL - 4 || x > padL + plotW + 4) {
      crosshair.style.display = 'none';
      tip.style.display = 'none';
      return;
    }
    const ratio = (x - padL) / plotW;
    const index = Math.max(
      0,
      Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))
    );
    const point = points[index];
    const px = xAt(index);
    const py = yAt(point[1]);

    crosshair.setAttribute('x1', String(px));
    crosshair.setAttribute('x2', String(px));
    crosshair.style.display = '';

    tip.innerHTML = `<b>${formatCurrency(point[1], options.currency)}</b><br><i>${stampLabel(
      point[0],
      options.range
    )}</i>`;
    tip.style.left = `${Math.min(Math.max(px, 44), width - 44)}px`;
    tip.style.top = `${Math.max(py, 30)}px`;
    tip.style.display = '';
  };

  const onLeave = () => {
    crosshair.style.display = 'none';
    tip.style.display = 'none';
  };

  svg.addEventListener('mousemove', onMove);
  svg.addEventListener('mouseleave', onLeave);

  return geometry;
}

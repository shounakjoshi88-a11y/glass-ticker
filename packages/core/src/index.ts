/**
 * <glass-ticker> - the Glass Ticker UI as a web component.
 *
 * Framework agnostic: plain HTML, React, Vue, Angular, Svelte, Solid, or
 * anything that can put an element on the page.
 *
 *   <glass-ticker symbols="NVDA,AAPL,TSLA" range="1D" theme="carbon"></glass-ticker>
 */

import {
  ChartResponse,
  Quote,
  RANGES,
  Range,
  SearchHit,
  TickerApi,
} from './api';
import { formatCurrency, formatNumber, formatPercent, renderChart } from './chart';
import { styles } from './styles';

const DEFAULT_SYMBOLS = ['^NSEI', '^BSESN', 'RELIANCE.NS', 'TCS.NS', 'AAPL', 'NVDA', 'BTC-USD'];

export interface GlassTickerEventDetail {
  symbol: string;
  quote?: Quote;
  range?: string;
}

export class GlassTickerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'symbols',
      'symbol',
      'range',
      'theme',
      'endpoint',
      'height',
      'title',
      'accent',
      'show-stats',
      'refresh',
    ];
  }

  private api: TickerApi;
  private quotes = new Map<string, Quote>();
  private chartData: ChartResponse | null = null;
  private searchHits: SearchHit[] = [];
  private searchIndex = -1;
  private searchTimer: number | undefined;
  private pollTimer: number | undefined;
  private abort: AbortController | undefined;
  private resizeTimer: number | undefined;
  private built = false;

  private listEl!: HTMLElement;
  private mainEl!: HTMLElement;
  private chartEl!: HTMLElement;
  private statsEl!: HTMLElement;
  private quoteEl!: HTMLElement;
  private rangesEl!: HTMLElement;
  private resultsEl!: HTMLElement;
  private searchInput!: HTMLInputElement;
  private footEl!: HTMLElement;

  constructor() {
    super();
    this.api = new TickerApi(this.getAttribute('endpoint') || '/api');
  }

  /* ------------------------------------------------------------- props */

  get symbols(): string[] {
    const raw = this.getAttribute('symbols');
    if (!raw) return DEFAULT_SYMBOLS;
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  set symbols(value: string[]) {
    this.setAttribute('symbols', value.join(','));
  }

  get symbol(): string {
    return this.getAttribute('symbol') || this.symbols[0] || 'NVDA';
  }

  set symbol(value: string) {
    this.setAttribute('symbol', value);
  }

  get range(): Range {
    const value = (this.getAttribute('range') || '1D').toUpperCase();
    return (RANGES as readonly string[]).includes(value) ? (value as Range) : '1D';
  }

  set range(value: string) {
    this.setAttribute('range', value);
  }

  get theme(): string {
    return this.getAttribute('theme') || 'carbon';
  }

  set theme(value: string) {
    this.setAttribute('theme', value);
  }

  get endpoint(): string {
    return this.getAttribute('endpoint') || '/api';
  }

  set endpoint(value: string) {
    this.setAttribute('endpoint', value);
  }

  /** Swap in a custom data client (useful for tests and exotic backends). */
  get apiClient(): TickerApi {
    return this.api;
  }

  set apiClient(client: TickerApi) {
    this.api = client;
  }

  get title(): string {
    return this.getAttribute('title') || 'Glass Ticker';
  }

  get refreshSeconds(): number {
    const value = Number(this.getAttribute('refresh'));
    return Number.isFinite(value) && value > 0 ? value : 30;
  }

  /* -------------------------------------------------------- lifecycle */

  connectedCallback(): void {
    if (!this.built) this.build();
    this.applyTheme();
    this.start();
  }

  disconnectedCallback(): void {
    this.stop();
    this.abort?.abort();
  }

  attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    if (previous === next) return;
    if (name === 'endpoint') {
      this.api = new TickerApi(next || '/api');
    }
    if (name === 'theme') {
      this.applyTheme();
      return;
    }
    if (!this.built) return;
    if (name === 'height') {
      this.chartEl.style.setProperty('--gt-chart-height', `${Number(next) || 240}px`);
      this.paintChart();
      return;
    }
    if (name === 'symbols' || name === 'symbol') {
      this.load();
      return;
    }
    if (name === 'range') {
      this.loadChart();
    }
  }

  /* ------------------------------------------------------------ render */

  private build(): void {
    this.built = true;
    const shadow = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    shadow.appendChild(style);

    const root = document.createElement('div');
    root.className = 'gt-root';
    root.innerHTML = `
      <div class="gt-head">
        <div class="gt-logo">GT</div>
        <div class="gt-title"></div>
        <div class="gt-search">
          <svg viewBox="0 0 24 24" width="13" height="13"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <input type="text" placeholder="Search symbol or company" autocomplete="off" spellcheck="false" aria-label="Search symbol or company">
          <div class="gt-results"></div>
        </div>
      </div>
      <div class="gt-body">
        <div class="gt-list"></div>
        <div class="gt-main">
          <div class="gt-quote"></div>
          <div class="gt-ranges"></div>
          <div class="gt-chart"></div>
          <div class="gt-stats"></div>
        </div>
      </div>
      <div class="gt-foot"></div>
    `;
    shadow.appendChild(root);

    this.listEl = root.querySelector('.gt-list')!;
    this.mainEl = root.querySelector('.gt-main')!;
    this.chartEl = root.querySelector('.gt-chart')!;
    this.statsEl = root.querySelector('.gt-stats')!;
    this.quoteEl = root.querySelector('.gt-quote')!;
    this.rangesEl = root.querySelector('.gt-ranges')!;
    this.resultsEl = root.querySelector('.gt-results')!;
    this.searchInput = root.querySelector('.gt-search input')!;
    this.footEl = root.querySelector('.gt-foot')!;

    (root.querySelector('.gt-title') as HTMLElement).textContent = this.title;
    this.chartEl.style.setProperty('--gt-chart-height', `${this.getAttribute('height') || 240}px`);

    this.rangesEl.innerHTML = RANGES.map(
      (range) =>
        `<button class="gt-range" data-range="${range}" type="button">${range}</button>`
    ).join('');
    this.rangesEl.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('.gt-range') as HTMLElement | null;
      if (!target) return;
      this.range = target.dataset.range || '1D';
      this.dispatchEvent(
        new CustomEvent('range-change', {
          detail: { symbol: this.symbol, range: this.range },
          bubbles: true,
        })
      );
    });

    this.listEl.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('.gt-row') as HTMLElement | null;
      if (!target) return;
      this.selectSymbol(target.dataset.symbol || '');
    });

    this.resultsEl.addEventListener('click', (event) => {
      const target = (event.target as HTMLElement).closest('.gt-hit') as HTMLElement | null;
      if (!target) return;
      this.pickSearch(Number(target.dataset.index));
    });

    this.searchInput.addEventListener('input', () => {
      window.clearTimeout(this.searchTimer);
      const value = this.searchInput.value.trim();
      if (!value) {
        this.closeSearch();
        return;
      }
      this.searchTimer = window.setTimeout(() => this.runSearch(value), 220);
    });

    this.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.moveSearch(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.moveSearch(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.pickSearch(this.searchIndex >= 0 ? this.searchIndex : 0);
      } else if (event.key === 'Escape') {
        this.closeSearch();
      }
    });

    document.addEventListener('click', this.onDocumentClick);

    const observer = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.paintChart(), 120);
    });
    observer.observe(this.chartEl);
  }

  private onDocumentClick = (event: Event) => {
    const path = event.composedPath();
    if (!path.includes(this)) this.closeSearch();
  };

  private applyTheme(): void {
    this.setAttribute('theme', this.theme);
  }

  /* ------------------------------------------------------------- data */

  private start(): void {
    this.load();
    window.clearInterval(this.pollTimer);
    this.pollTimer = window.setInterval(() => this.load(), this.refreshSeconds * 1000);
  }

  private stop(): void {
    window.clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }

  /** Reload quotes and the chart. */
  async load(): Promise<void> {
    await Promise.all([this.loadQuotes(), this.loadChart()]);
  }

  private async loadQuotes(): Promise<void> {
    const symbols = this.symbols;
    if (!symbols.length) return;
    this.abort?.abort();
    this.abort = new AbortController();
    try {
      const payload = await this.api.quotes(symbols, this.abort.signal);
      this.quotes = new Map(payload.quotes.map((quote) => [quote.symbol, quote]));
      this.paintList();
      this.paintQuote();
      this.dispatchEvent(
        new CustomEvent('quotes', { detail: { quotes: payload.quotes }, bubbles: true })
      );
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.dispatchEvent(
          new CustomEvent('error', { detail: { error }, bubbles: true })
        );
      }
    }
  }

  private async loadChart(): Promise<void> {
    const symbol = this.symbol;
    try {
      const chart = await this.api.chart(symbol, this.range);
      if (symbol !== this.symbol) return;
      this.chartData = chart;
      this.paintChart();
      this.dispatchEvent(
        new CustomEvent('chart', { detail: { symbol, range: this.range }, bubbles: true })
      );
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', { detail: { error }, bubbles: true }));
    }
  }

  /* ----------------------------------------------------------- actions */

  /** Select a symbol, updating the attribute and the UI. */
  selectSymbol(symbol: string): void {
    if (!symbol) return;
    this.symbol = symbol;
    this.closeSearch();
    this.loadChart();
    this.paintList();
    this.paintQuote();
    this.dispatchEvent(
      new CustomEvent('symbol-change', {
        detail: { symbol, quote: this.quotes.get(symbol) },
        bubbles: true,
      })
    );
  }

  /* ----------------------------------------------------------- painting */

  private paintList(): void {
    const current = this.symbol;
    this.listEl.innerHTML = this.symbols
      .map((symbol) => {
        const quote = this.quotes.get(symbol);
        const change = quote?.changePercent ?? null;
        const direction =
          change === null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
        const arrow = change === null ? '' : change > 0 ? '▲' : change < 0 ? '▼' : '';
        const avatar = quote?.logoUrl
          ? `<img class="gt-avatar" src="${quote.logoUrl}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(''))">`
          : `<div class="gt-avatar gt-mono">${symbol.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}</div>`;
        return `<div class="gt-row ${symbol === current ? 'sel' : ''}" data-symbol="${symbol}">
          ${avatar}
          <div>
            <div class="gt-mono">${symbol}</div>
            <div class="gt-sub">${quote?.name ?? ''}</div>
          </div>
          <div>
            <div class="gt-px">${formatCurrency(quote?.price ?? null, quote?.currency ?? null)}</div>
            <div class="gt-ch gt-${direction}">${arrow} ${formatPercent(change)}</div>
          </div>
        </div>`;
      })
      .join('');
  }

  private paintQuote(): void {
    const quote = this.quotes.get(this.symbol);
    const change = quote?.changePercent ?? null;
    const direction =
      change === null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    this.quoteEl.innerHTML = `
      <div class="gt-name">${quote?.name ?? this.symbol}</div>
      <div class="gt-exchange">${this.symbol} · ${quote?.exchange ?? ''}</div>
      <div class="gt-price">${formatCurrency(quote?.price ?? null, quote?.currency ?? null)}</div>
      <div class="gt-badge ${direction}">${formatPercent(change)}</div>
    `;

    this.rangesEl.querySelectorAll('.gt-range').forEach((node) => {
      node.classList.toggle('active', (node as HTMLElement).dataset.range === this.range);
    });

    if (this.getAttribute('show-stats') !== 'false') {
      const rows: Array<[string, string]> = [
        ['Open', formatCurrency(quote?.open ?? null, quote?.currency ?? null)],
        ['Day high', formatCurrency(quote?.dayHigh ?? null, quote?.currency ?? null)],
        ['Day low', formatCurrency(quote?.dayLow ?? null, quote?.currency ?? null)],
        ['Prev close', formatCurrency(quote?.previousClose ?? null, quote?.currency ?? null)],
        ['52W high', formatCurrency(quote?.week52High ?? null, quote?.currency ?? null)],
        ['52W low', formatCurrency(quote?.week52Low ?? null, quote?.currency ?? null)],
        ['Volume', quote?.volume ? formatNumber(quote.volume, 0) : '--'],
        ['Mkt cap', quote?.marketCap ? formatNumber(quote.marketCap / 1e9, 2) + 'B' : '--'],
        ['P/E', formatNumber(quote?.trailingPE ?? null)],
      ];
      this.statsEl.innerHTML = rows
        .map(
          ([key, value]) =>
            `<div class="gt-stat"><span>${key}</span><b>${value}</b></div>`
        )
        .join('');
    } else {
      this.statsEl.innerHTML = '';
    }
  }

  private paintChart(): void {
    const chart = this.chartData;
    if (!chart) return;
    renderChart(this.chartEl, {
      points: chart.points,
      previousClose: chart.previousClose,
      currency: chart.currency,
      range: this.range,
      upColor: getComputedStyle(this).getPropertyValue('--gt-up').trim() || '#5eeaa8',
      downColor: getComputedStyle(this).getPropertyValue('--gt-down').trim() || '#ff7a6b',
    });
    const quote = this.quotes.get(this.symbol);
    this.footEl.innerHTML = `<span>${chart.marketState ?? ''}</span><span>${quote?.exchange ?? ''}</span>`;
  }

  /* ------------------------------------------------------------ search */

  private async runSearch(query: string): Promise<void> {
    try {
      const payload = await this.api.search(query);
      this.searchHits = payload.results || [];
      this.searchIndex = -1;
      this.resultsEl.innerHTML = this.searchHits.length
        ? this.searchHits
            .map(
              (hit, index) =>
                `<div class="gt-hit" data-index="${index}"><b>${hit.symbol}</b><span>${hit.name}</span></div>`
            )
            .join('')
        : '<div class="gt-hit"><span>No matches</span></div>';
      this.resultsEl.classList.add('open');
    } catch (error) {
      this.dispatchEvent(new CustomEvent('error', { detail: { error }, bubbles: true }));
    }
  }

  private moveSearch(delta: number): void {
    if (!this.searchHits.length) return;
    this.searchIndex = (this.searchIndex + delta + this.searchHits.length) % this.searchHits.length;
    this.resultsEl.querySelectorAll('.gt-hit').forEach((node, index) => {
      node.classList.toggle('sel', index === this.searchIndex);
    });
  }

  private pickSearch(index: number): void {
    const hit = this.searchHits[index];
    if (!hit) return;
    this.searchInput.value = '';
    this.closeSearch();
    const symbols = this.symbols.includes(hit.symbol)
      ? this.symbols
      : [...this.symbols, hit.symbol];
    this.symbols = symbols;
    this.selectSymbol(hit.symbol);
  }

  private closeSearch(): void {
    this.resultsEl.classList.remove('open');
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('glass-ticker')) {
  customElements.define('glass-ticker', GlassTickerElement);
}

export { TickerApi } from './api';
export type { Quote, ChartResponse, SearchHit, Range } from './api';
export { formatCurrency, formatNumber, formatPercent } from './chart';
export default GlassTickerElement;

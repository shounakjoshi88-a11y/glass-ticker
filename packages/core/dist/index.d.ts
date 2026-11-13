/**
 * <glass-ticker> - the Glass Ticker UI as a web component.
 *
 * Framework agnostic: plain HTML, React, Vue, Angular, Svelte, Solid, or
 * anything that can put an element on the page.
 *
 *   <glass-ticker symbols="NVDA,AAPL,TSLA" range="1D" theme="carbon"></glass-ticker>
 */
import { Quote, Range, TickerApi } from './api';
export interface GlassTickerEventDetail {
    symbol: string;
    quote?: Quote;
    range?: string;
}
export declare class GlassTickerElement extends HTMLElement {
    static get observedAttributes(): string[];
    private api;
    private quotes;
    private chartData;
    private searchHits;
    private searchIndex;
    private searchTimer;
    private pollTimer;
    private abort;
    private resizeTimer;
    private built;
    private listEl;
    private mainEl;
    private chartEl;
    private statsEl;
    private quoteEl;
    private rangesEl;
    private resultsEl;
    private searchInput;
    private footEl;
    constructor();
    get symbols(): string[];
    set symbols(value: string[]);
    get symbol(): string;
    set symbol(value: string);
    get range(): Range;
    set range(value: string);
    get theme(): string;
    set theme(value: string);
    get endpoint(): string;
    set endpoint(value: string);
    /** Swap in a custom data client (useful for tests and exotic backends). */
    get apiClient(): TickerApi;
    set apiClient(client: TickerApi);
    get title(): string;
    get refreshSeconds(): number;
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string, previous: string | null, next: string | null): void;
    private build;
    private onDocumentClick;
    private applyTheme;
    private start;
    private stop;
    /** Reload quotes and the chart. */
    load(): Promise<void>;
    private loadQuotes;
    private loadChart;
    /** Select a symbol, updating the attribute and the UI. */
    selectSymbol(symbol: string): void;
    private paintList;
    private paintQuote;
    private paintChart;
    private runSearch;
    private moveSearch;
    private pickSearch;
    private closeSearch;
}
export { TickerApi } from './api';
export type { Quote, ChartResponse, SearchHit, Range } from './api';
export { formatCurrency, formatNumber, formatPercent } from './chart';
export default GlassTickerElement;

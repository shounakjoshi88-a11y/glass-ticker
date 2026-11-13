/** Data types shared by the component and the reference servers. */
export interface Quote {
    symbol: string;
    name: string;
    exchange: string;
    currency: string | null;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    previousClose: number | null;
    open: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    volume: number | null;
    marketCap: number | null;
    trailingPE: number | null;
    dividendYield: number | null;
    week52High: number | null;
    week52Low: number | null;
    marketState: string;
    logoUrl: string | null;
}
export interface ChartResponse {
    symbol: string;
    range: string;
    points: Array<[number, number]>;
    previousClose: number | null;
    currency: string | null;
    marketState: string;
}
export interface SearchHit {
    symbol: string;
    name: string;
    exchange: string;
    type?: string;
}
export interface QuotesResponse {
    quotes: Quote[];
    source?: string;
}
export interface SearchResponse {
    results: SearchHit[];
    source?: string;
}
export declare const RANGES: readonly ["1D", "5D", "1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"];
export type Range = (typeof RANGES)[number];
/** Thin client for the companion data API. */
export declare class TickerApi {
    readonly base: string;
    constructor(base?: string);
    private get;
    quotes(symbols: string[], signal?: AbortSignal): Promise<QuotesResponse>;
    chart(symbol: string, range: string, signal?: AbortSignal): Promise<ChartResponse>;
    search(query: string, signal?: AbortSignal): Promise<SearchResponse>;
}

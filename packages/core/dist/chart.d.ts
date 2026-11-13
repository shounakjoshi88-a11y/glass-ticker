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
export declare function formatNumber(value: number | null, places?: number): string;
export declare function formatCurrency(value: number | null, currency: string | null, places?: number): string;
export declare function formatPercent(value: number | null, places?: number): string;
export declare function renderChart(container: HTMLElement, options: ChartOptions): Geometry | null;
export {};

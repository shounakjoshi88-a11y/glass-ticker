import '@glass-ticker/core';
export interface GlassTickerProps {
    /** Symbols to show, for example ['NVDA', 'AAPL'] */
    symbols?: string[];
    /** The selected symbol */
    symbol?: string;
    /** Chart range: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, MAX */
    range?: string;
    /** carbon | dark | light | glass */
    theme?: string;
    /** Base URL of the data API */
    endpoint?: string;
    /** Chart height in pixels */
    height?: number;
    /** Header title */
    title?: string;
    /** Poll interval in seconds */
    refresh?: number;
    /** Hide the statistics row */
    showStats?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onSymbolChange?: (symbol: string) => void;
    onRangeChange?: (range: string) => void;
}
/**
 * Glass Ticker as a React component.
 *
 *   import { GlassTicker } from '@glass-ticker/react';
 *   <GlassTicker symbols={['NVDA', 'AAPL']} symbol="NVDA" endpoint="/api" />
 */
export declare function GlassTicker(props: GlassTickerProps): import("react").ReactElement<{
    ref: never;
    className: string | undefined;
    style: import("react").CSSProperties | undefined;
}, string | import("react").JSXElementConstructor<any>>;
export default GlassTicker;
export type { Quote, ChartResponse, SearchHit, Range } from '@glass-ticker/core';

import { createElement, useEffect, useRef } from 'react';
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
export function GlassTicker(props: GlassTickerProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const onSymbol = (event: Event) => {
      props.onSymbolChange?.((event as CustomEvent).detail.symbol);
    };
    const onRange = (event: Event) => {
      props.onRangeChange?.((event as CustomEvent).detail.range);
    };
    element.addEventListener('symbol-change', onSymbol);
    element.addEventListener('range-change', onRange);
    return () => {
      element.removeEventListener('symbol-change', onSymbol);
      element.removeEventListener('range-change', onRange);
    };
  }, [props.onSymbolChange, props.onRangeChange]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (props.symbols) element.setAttribute('symbols', props.symbols.join(','));
    if (props.symbol) element.setAttribute('symbol', props.symbol);
    if (props.range) element.setAttribute('range', props.range);
    if (props.theme) element.setAttribute('theme', props.theme);
    if (props.endpoint) element.setAttribute('endpoint', props.endpoint);
    if (props.title) element.setAttribute('title', props.title);
    if (props.height) element.setAttribute('height', String(props.height));
    if (props.refresh) element.setAttribute('refresh', String(props.refresh));
    if (props.showStats === false) element.setAttribute('show-stats', 'false');
  }, [
    props.symbols,
    props.symbol,
    props.range,
    props.theme,
    props.endpoint,
    props.title,
    props.height,
    props.refresh,
    props.showStats,
  ]);

  return createElement('glass-ticker', {
    ref: ref as never,
    className: props.className,
    style: props.style,
  });
}

export default GlassTicker;
export type { Quote, ChartResponse, SearchHit, Range } from '@glass-ticker/core';

import '@glass-ticker/core';
export interface GlassTickerProps {
    symbols?: string[];
    symbol?: string;
    range?: string;
    theme?: string;
    endpoint?: string;
    height?: number;
    title?: string;
    refresh?: number;
    showStats?: boolean;
}
export declare const GlassTicker: import("vue").DefineComponent<import("vue").ExtractPropTypes<{
    symbols: {
        type: () => string[];
        default: undefined;
    };
    symbol: {
        type: StringConstructor;
        default: undefined;
    };
    range: {
        type: StringConstructor;
        default: undefined;
    };
    theme: {
        type: StringConstructor;
        default: undefined;
    };
    endpoint: {
        type: StringConstructor;
        default: undefined;
    };
    height: {
        type: NumberConstructor;
        default: undefined;
    };
    title: {
        type: StringConstructor;
        default: undefined;
    };
    refresh: {
        type: NumberConstructor;
        default: undefined;
    };
    showStats: {
        type: BooleanConstructor;
        default: undefined;
    };
}>, () => import("vue").VNode<import("vue").RendererNode, import("vue").RendererElement, {
    [key: string]: any;
}>, {}, {}, {}, import("vue").ComponentOptionsMixin, import("vue").ComponentOptionsMixin, ("symbol-change" | "range-change")[], "symbol-change" | "range-change", import("vue").PublicProps, Readonly<import("vue").ExtractPropTypes<{
    symbols: {
        type: () => string[];
        default: undefined;
    };
    symbol: {
        type: StringConstructor;
        default: undefined;
    };
    range: {
        type: StringConstructor;
        default: undefined;
    };
    theme: {
        type: StringConstructor;
        default: undefined;
    };
    endpoint: {
        type: StringConstructor;
        default: undefined;
    };
    height: {
        type: NumberConstructor;
        default: undefined;
    };
    title: {
        type: StringConstructor;
        default: undefined;
    };
    refresh: {
        type: NumberConstructor;
        default: undefined;
    };
    showStats: {
        type: BooleanConstructor;
        default: undefined;
    };
}>> & Readonly<{
    "onSymbol-change"?: ((...args: any[]) => any) | undefined;
    "onRange-change"?: ((...args: any[]) => any) | undefined;
}>, {
    symbol: string;
    symbols: string[];
    range: string;
    theme: string;
    endpoint: string;
    height: number;
    title: string;
    refresh: number;
    showStats: boolean;
}, {}, {}, {}, string, import("vue").ComponentProvideOptions, true, {}, any>;
export default GlassTicker;

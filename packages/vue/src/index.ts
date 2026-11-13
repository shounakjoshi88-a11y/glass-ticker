import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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

export const GlassTicker = defineComponent({
  name: 'GlassTicker',
  props: {
    symbols: { type: Array as () => string[], default: undefined },
    symbol: { type: String, default: undefined },
    range: { type: String, default: undefined },
    theme: { type: String, default: undefined },
    endpoint: { type: String, default: undefined },
    height: { type: Number, default: undefined },
    title: { type: String, default: undefined },
    refresh: { type: Number, default: undefined },
    showStats: { type: Boolean, default: undefined },
  },
  emits: ['symbol-change', 'range-change'],
  setup(props, { emit }) {
    const element = ref<HTMLElement | null>(null);

    const onSymbol = (event: Event) => {
      emit('symbol-change', (event as CustomEvent).detail.symbol);
    };
    const onRange = (event: Event) => {
      emit('range-change', (event as CustomEvent).detail.range);
    };

    onMounted(() => {
      element.value?.addEventListener('symbol-change', onSymbol);
      element.value?.addEventListener('range-change', onRange);
    });

    onBeforeUnmount(() => {
      element.value?.removeEventListener('symbol-change', onSymbol);
      element.value?.removeEventListener('range-change', onRange);
    });

    watch(
      () => [
        props.symbols,
        props.symbol,
        props.range,
        props.theme,
        props.endpoint,
        props.title,
        props.height,
        props.refresh,
        props.showStats,
      ],
      () => {
        const node = element.value;
        if (!node) return;
        if (props.symbols) node.setAttribute('symbols', props.symbols.join(','));
        if (props.symbol) node.setAttribute('symbol', props.symbol);
        if (props.range) node.setAttribute('range', props.range);
        if (props.theme) node.setAttribute('theme', props.theme);
        if (props.endpoint) node.setAttribute('endpoint', props.endpoint);
        if (props.title) node.setAttribute('title', props.title);
        if (props.height) node.setAttribute('height', String(props.height));
        if (props.refresh) node.setAttribute('refresh', String(props.refresh));
        if (props.showStats === false) node.setAttribute('show-stats', 'false');
      }
    );

    return () =>
      h('glass-ticker', {
        ref: element,
        style: { display: 'block', height: '100%' },
      });
  },
});

export default GlassTicker;

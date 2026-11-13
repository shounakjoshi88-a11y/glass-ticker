# @glass-ticker/react

Glass Ticker as a React component.

```bash
npm install @glass-ticker/react
```

```tsx
import { GlassTicker } from '@glass-ticker/react';

export function Watch() {
  return (
    <GlassTicker
      symbols={['NVDA', 'AAPL', 'TSLA']}
      symbol="NVDA"
      endpoint="/api"
      height={320}
      onSymbolChange={(symbol) => console.log(symbol)}
    />
  );
}
```

The component needs a data API - see
[@glass-ticker/core](https://www.npmjs.com/package/@glass-ticker/core) for the
endpoints and the reference servers (`@glass-ticker/server`, the PyPI
`glass-ticker` package, or the Maven `glass-ticker-launcher`).

Props: `symbols`, `symbol`, `range`, `theme`, `endpoint`, `height`, `title`,
`refresh`, `showStats`, plus `onSymbolChange` and `onRangeChange` callbacks.

## License

MIT

# @glass-ticker/vue

Glass Ticker as a Vue 3 component.

```bash
npm install @glass-ticker/vue
```

```vue
<script setup>
import { GlassTicker } from '@glass-ticker/vue';
</script>

<template>
  <GlassTicker :symbols="['NVDA', 'AAPL']" symbol="NVDA" endpoint="/api" />
</template>
```

The component needs a data API - see
[@glass-ticker/core](https://www.npmjs.com/package/@glass-ticker/core) for the
endpoints and the reference servers (`@glass-ticker/server`, the PyPI
`glass-ticker` package, or the Maven `glass-ticker-launcher`).

Props: `symbols`, `symbol`, `range`, `theme`, `endpoint`, `height`, `title`,
`refresh`, `showStats`. Emits `symbol-change` and `range-change`.

## License

MIT

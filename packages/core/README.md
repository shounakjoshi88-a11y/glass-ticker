# @glass-ticker/core

Glass Ticker as an **embeddable web component**. One custom element, no
framework, no build step required.

```html
<script type="module" src="https://unpkg.com/@glass-ticker/core/dist/glass-ticker.js"></script>

<glass-ticker symbols="NVDA,AAPL,TSLA" symbol="NVDA" range="1D" theme="carbon"></glass-ticker>
```

That is the whole integration. It works in plain HTML, React, Vue, Angular,
Svelte, Solid, Electron, Tauri, WebView2, JavaFX, or anything else that can
put an element on a page.

## Why there is a server

A browser cannot call Yahoo Finance directly - the API does not send CORS
headers. So the component reads from a small data API instead:

```
GET /api/quotes?symbols=NVDA,AAPL
GET /api/chart?symbol=NVDA&range=1D
GET /api/search?q=tesla
```

Reference implementations ship in every language binding:

| Language | Package | Start it |
| --- | --- | --- |
| Node / TypeScript | `@glass-ticker/server` | `npx glass-ticker-server --port 8787` |
| Python | `glass-ticker` (PyPI) | `glass-ticker serve --port 8787` |
| Java | `com.github.shounakjoshi88:glass-ticker-launcher` | `java -jar glass-ticker-launcher.jar 8787` |

Point the component at it with the `endpoint` attribute (default `/api`).

## Attributes

| Attribute | Type | Default | What it does |
| --- | --- | --- | --- |
| `symbols` | csv | a mixed list | symbols in the watchlist |
| `symbol` | string | first symbol | the selected symbol |
| `range` | string | `1D` | `1D 5D 1M 3M 6M YTD 1Y 5Y MAX` |
| `theme` | string | `carbon` | `carbon`, `dark`, `light`, `glass` |
| `endpoint` | string | `/api` | base URL of the data API |
| `height` | number | `240` | chart height in pixels |
| `title` | string | `Glass Ticker` | header title |
| `refresh` | number | `30` | poll interval in seconds |
| `show-stats` | boolean | `true` | show the statistics row |

The same values are available as properties on the element:

```js
const ticker = document.querySelector('glass-ticker');
ticker.symbols = ['NVDA', 'AAPL'];
ticker.range = '5D';
ticker.theme = 'light';
```

## Events

| Event | Detail | When |
| --- | --- | --- |
| `symbol-change` | `{ symbol, quote }` | the user picks another symbol |
| `range-change` | `{ symbol, range }` | the user changes the range |
| `quotes` | `{ quotes }` | a poll finished |
| `chart` | `{ symbol, range }` | a new series arrived |
| `error` | `{ error }` | a request failed |

## React

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

## Vue

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

## Angular

Angular speaks custom elements natively - register the schema and use it:

```ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@glass-ticker/core';

@NgModule({ schemas: [CUSTOM_ELEMENTS_SCHEMA] })
export class AppModule {}
```

```html
<glass-ticker symbols="NVDA,AAPL" endpoint="/api"></glass-ticker>
```

## Svelte

```svelte
<script>
  import '@glass-ticker/core';
</script>

<glass-ticker symbols="NVDA,AAPL" endpoint="/api"></glass-ticker>
```

## Python

```bash
pip install glass-ticker
```

Run the data API and embed it in any page you serve:

```python
from glass_ticker.server import TickerServer, iframe_html

with TickerServer(port=8787) as server:
    page = f"<html><body>{iframe_html(server.url, height=520)}</body></html>"
    # hand `page` to your web framework, or write it to a file
```

Or point a desktop shell at it:

```python
import webview
from glass_ticker.server import TickerServer

with TickerServer() as server:
    webview.create_window("Glass Ticker", server.url())
    webview.start()
```

## Java

```xml
<dependency>
  <groupId>com.github.shhounakjoshi88</groupId>
  <artifactId>glass-ticker-launcher</artifactId>
  <version>2.5.0</version>
</dependency>
```

```java
try (TickerServer server = TickerServer.start(8787)) {
    String html = Embed.iframe(server.url());
    // serve `html` from your servlet, or load it in a JavaFX WebView
}
```

## Any other stack

The component is just HTML, so anything that can host a web view can host
it:

- **.NET WPF / WinUI** - `WebView2` pointing at the server URL
- **Go, Rust, C#, Kotlin, Swift** - serve the API, load the URL
- **Flutter / React Native** - use a `WebView`, or port the API calls

You can also skip the server entirely and point `endpoint` at any URL that
returns the three JSON shapes above - your own backend, a proxy, whatever.

## Styling

The component renders inside a shadow root, so page CSS cannot leak into it.
Reach it with CSS custom properties instead:

```css
glass-ticker {
  --gt-bg: #0b0b0d;
  --gt-accent: #5eeaa8;
  --gt-radius: 14px;
}
```

## License

MIT

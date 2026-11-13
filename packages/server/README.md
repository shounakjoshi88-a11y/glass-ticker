# @glass-ticker/server

The reference data API for the Glass Ticker web component.

```bash
npm install @glass-ticker/server
npx glass-ticker-server --port 8787
```

```
GET /api/quotes?symbols=NVDA,AAPL
GET /api/chart?symbol=NVDA&range=1D
GET /api/search?q=tesla
GET /                     the demo page with the component in it
```

No dependencies - it uses the Node standard library only. The same three
endpoints ship with the Python (`glass-ticker` on PyPI) and Java
(`glass-ticker-launcher` on Maven Central) packages.

Use it as a library when you want to mount the API inside your own server:

```js
import { createServer } from '@glass-ticker/server';

createServer().listen(8787);
```

## License

MIT

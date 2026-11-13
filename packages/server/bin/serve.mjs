import { createServer } from '../../server/server.mjs';

const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 8787;
createServer().listen(port, () => {
  console.log(`Glass Ticker data API on http://127.0.0.1:${port}`);
});

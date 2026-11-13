/**
 * Reference data server for the Glass Ticker component.
 *
 * The browser cannot call Yahoo directly (CORS), so the component talks to a
 * small API. This is a dependency-free Node implementation - the Python and
 * Java packages ship the same three endpoints.
 *
 *   node packages/server/bin/serve.mjs --port 8787
 *
 *   GET /api/quotes?symbols=NVDA,AAPL
 *   GET /api/chart?symbol=NVDA&range=1D
 *   GET /api/search?q=tesla
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

const RANGES = {
  '1D': ['1d', '1m', ['2m', '5m']],
  '5D': ['5d', '15m', ['30m', '1h']],
  '1M': ['1mo', '1h', ['30m', '1d']],
  '3M': ['3mo', '1d', ['1wk']],
  '6M': ['6mo', '1d', ['1wk']],
  YTD: ['ytd', '1d', ['1wk']],
  '1Y': ['1y', '1d', ['1wk']],
  '5Y': ['5y', '1wk', ['1mo']],
  MAX: ['max', '1mo', ['3mo']],
};

const LOGO_DOMAINS = {
  'AAPL': 'apple.com',
  'MSFT': 'microsoft.com',
  'GOOGL': 'google.com',
  'AMZN': 'amazon.com',
  'META': 'meta.com',
  'TSLA': 'tesla.com',
  'NVDA': 'nvidia.com',
  'INFY': 'infosys.com',
  'TCS': 'tcs.com',
  'RELIANCE': 'ril.com',
  'HDFCBANK': 'hdfcbank.com',
  'ICICIBANK': 'icicibank.com',
  'SBIN': 'sbi.co.in',
  'ITC': 'itcportal.com',
  'BHARTIARTL': 'bhartiarthtel.com',
  'LT': 'larsentoubro.com',
  'AXISBANK': 'axisbank.com',
  'MARUTI': 'marutisuzuki.com',
  'TATAMOTORS': 'tatamotors.com',
  'ADANIENT': 'adani.com',
  'WIPRO': 'wipro.com',
  'HCLTECH': 'hcltech.com',
  'BAJAJFINSV': 'bajajfinserv.in',
  'KOTAKBANK': 'kotak.com',
  'ONGC': 'ongc.co.in',
  'NTPC': 'ntpc.co.in',
  'POWERGRID': 'powergrid.in',
  'TITAN': 'titancompany.in',
  'ASIANPAINT': 'asianpaint.com',
  'ULTRACEMCO': 'ultratechcement.com',
  'JSWSTEEL': 'jswsteel.in',
  'COALINDIA': 'coalindia.in',
  'SUNPHARMA': 'sunpharma.com',
  'CIPLA': 'cipla.com',
  'HINDUNILVR': 'hindunilvr.com',
  'NESTLEIND': 'nestleindia.in',
  'GRASIM': 'grasim.com',
  'DRREDDY': 'drreddys.com',
  'EICHERMOT': 'eicher.in',
  'BRITANNIA': 'britannia.co.in',
  'BPCL': 'bpccindia.com',
  'IOC': 'iocl.com',
  'HAL': 'hal-india.co.in',
  'BEL': 'bel.co.in',
  'VEDL': 'vedl.com',
  'ZOMATO': 'zomato.com',
  'PAYTM': 'paytm.com',
  'NYKAA': 'nykaa.com',
  'IRFC': 'irfc.co.in',
  'DMART': 'd-mart.com',
  'PIDILITIND': 'pidilite.com',
  'SIEMENS': 'siemens.com',
  'ABB': 'abb.com',
  'SBILIFE': 'sbilife.co.in',
  'HDFCLIFE': 'hdfclife.com',
  'ICICIGI': 'icicilomburgi.com',
  'BAJAJ-AUTO': 'bajajauto.com',
  'M&M': 'mahindra.com',
  'HEROMOTOCO': 'heromotocorp.com',
  'DIVISLAB': 'divislabs.com',
  'APOLLOHOSP': 'apollohospitals.com',
  'TORNTPHARM': 'torntpharma.com',
  'TECHM': 'techmahindra.com',
  'LTIM': 'ltimindtree.com',
  'POLYCAB': 'polycabindia.com',
  'ASTRAL': 'astralpipeline.com',
  'CUMMINSIND': 'cumminsindia.com',
  'GAIL': 'gailonline.com',
  'CANARA': 'canarabank.com',
  'PNB': 'pnbindia.in',
  'IDBI': 'idbi.co.in',
  'FEDERALBK': 'federalbank.co.in',
  'BANDHANBNK': 'bandhanbank.in',
  'LICI': 'licindia.in',
  'SBIN.NS': 'sbi.co.in',
  'BTC-USD': 'bitcoin.org',
  'ETH-USD': 'ethereum.org',
  'SOL-USD': 'solana.com',
  'XRP-USD': 'ripple.com',
  'DOGE-USD': 'dogecoin.com',
  '^NSEI': 'nseindia.com',
  '^BSESN': 'bseindia.com',
  '^NSEBANK': 'nseindia.com',
  '^CNXIT': 'nseindia.com',
};

let crumb = null;
let crumbAt = 0;

/**
 * Minimal cookie jar. Yahoo ties the crumb to the cookie that fc.yahoo.com
 * sets, and Node's fetch has no cookie store of its own.
 */
const cookies = new Map();

function storeCookies(response) {
  const raw =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  for (const line of raw) {
    const pair = line.split(';')[0];
    const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1).trim());
  }
}

function cookieHeader() {
  return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function fetchJson(url, extraHeaders = {}) {
  const headers = { 'User-Agent': UA, Accept: 'application/json', ...extraHeaders };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(url, { headers });
  storeCookies(response);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url}${body ? ` - ${body.slice(0, 200)}` : ''}`);
  }
  return response.json();
}

async function getCrumb() {
  if (crumb && Date.now() - crumbAt < 30 * 60 * 1000) return crumb;
  try {
    const response = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': UA, Cookie: cookieHeader() },
    });
    storeCookies(response);
    await response.text().catch(() => '');
  } catch {
    /* the endpoint errors on purpose, it only sets cookies */
  }
  const response = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookieHeader() },
  });
  storeCookies(response);
  const text = (await response.text()).trim();
  if (!text || text.startsWith('{') || text.startsWith('<')) {
    throw new Error(`crumb request returned ${text.slice(0, 120)}`);
  }
  crumb = text;
  crumbAt = Date.now();
  return crumb;
}

function num(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function logoFor(symbol) {
  // Indian listings carry a suffix (.NS / .BO); the base symbol is the key.
  const base = symbol.replace(/\.(NS|BO)$/i, '');
  const domain = LOGO_DOMAINS[symbol] || LOGO_DOMAINS[base];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

async function quotes(symbols) {
  if (!symbols.length) return [];
  try {
    return await batchQuotes(symbols);
  } catch (error) {
    // Yahoo's batch quote endpoint refuses requests now and then. The chart
    // endpoint has no such restriction, so rebuild the quote from it.
    const settled = await Promise.allSettled(symbols.map(quoteFromChart));
    const values = settled
      .filter((entry) => entry.status === 'fulfilled')
      .map((entry) => entry.value);
    if (values.length) return values;
    throw error;
  }
}

async function batchQuotes(symbols) {
  const clean = await getCrumb();
  const url =
    'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
    encodeURIComponent(symbols.join(',')) +
    '&crumb=' +
    encodeURIComponent(clean);
  let payload;
  try {
    payload = await fetchJson(url);
  } catch (error) {
    // A stale crumb is the usual reason for a 401 here - refresh once.
    crumb = null;
    const refreshed = await getCrumb();
    payload = await fetchJson(
      'https://query1.finance.yahoo.com/v7/finance/quote?symbols=' +
        encodeURIComponent(symbols.join(',')) +
        '&crumb=' +
        encodeURIComponent(refreshed)
    );
  }
  const results = (payload?.quoteResponse?.result) || [];
  if (!results.length) throw new Error('empty quote response');
  return results.map((item) => ({
    symbol: item.symbol,
    name: item.longName || item.shortName || item.symbol,
    exchange: item.fullExchangeName || item.exchange || '',
    currency: item.currency || null,
    price: num(item.regularMarketPrice),
    change: num(item.regularMarketChange),
    changePercent: num(item.regularMarketChangePercent),
    previousClose: num(item.regularMarketPreviousClose ?? item.previousClose),
    open: num(item.regularMarketOpen),
    dayHigh: num(item.regularMarketDayHigh),
    dayLow: num(item.regularMarketDayLow),
    volume: num(item.regularMarketVolume),
    marketCap: num(item.marketCap),
    trailingPE: num(item.trailingPE),
    dividendYield: num(item.dividendYield),
    week52High: num(item.fiftyTwoWeekHigh),
    week52Low: num(item.fiftyTwoWeekLow),
    marketState: item.marketState || 'CLOSED',
    logoUrl: logoFor(item.symbol),
  }));
}

/** Build a quote from the chart endpoint, which needs no crumb. */
async function quoteFromChart(symbol) {
  const payload = await fetchJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true`
  );
  const meta = (payload?.chart?.result || [])[0]?.meta || {};
  const price = num(meta.regularMarketPrice);
  const previousClose = num(meta.previousClose ?? meta.chartPreviousClose);
  const change = price !== null && previousClose !== null ? price - previousClose : null;
  return {
    symbol: meta.symbol || symbol,
    name: meta.longName || meta.shortName || symbol,
    exchange: meta.fullExchangeName || meta.exchangeName || '',
    currency: meta.currency || null,
    price,
    change,
    changePercent: change !== null && previousClose ? (change / previousClose) * 100 : null,
    previousClose,
    open: num(meta.regularMarketOpen),
    dayHigh: num(meta.regularMarketDayHigh),
    dayLow: num(meta.regularMarketDayLow),
    volume: num(meta.regularMarketVolume),
    marketCap: null,
    trailingPE: null,
    dividendYield: null,
    week52High: num(meta.fiftyTwoWeekHigh),
    week52Low: num(meta.fiftyTwoWeekLow),
    marketState: meta.marketState || 'CLOSED',
    logoUrl: logoFor(symbol),
  };
}

async function chart(symbol, range) {
  const [yahooRange, interval, fallbacks] = RANGES[range.toUpperCase()] || RANGES['1D'];
  for (const candidate of [interval, ...fallbacks]) {
    try {
      const payload = await fetchJson(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${yahooRange}&interval=${candidate}&includePrePost=true`
      );
      const result = (payload?.chart?.result || [])[0];
      if (!result) continue;
      const meta = result.meta || {};
      const stamps = result.timestamp || [];
      const closes = ((result.indicators?.quote || [{}])[0] || {}).close || [];
      const points = [];
      for (let index = 0; index < stamps.length && index < closes.length; index += 1) {
        if (closes[index] === null || closes[index] === undefined) continue;
        points.push([stamps[index], closes[index]]);
      }
      return {
        symbol,
        range: range.toUpperCase(),
        points,
        previousClose: num(meta.previousClose ?? meta.chartPreviousClose),
        currency: meta.currency || null,
        marketState: meta.marketState || 'REGULAR',
      };
    } catch {
      /* try the next interval */
    }
  }
  throw new Error(`no chart data for ${symbol}`);
}

async function search(query) {
  const payload = await fetchJson(
    'https://query1.finance.yahoo.com/v1/finance/search?q=' +
      encodeURIComponent(query) +
      '&quotesCount=8&newsCount=0'
  );
  return (payload?.quotes || [])
    .filter((item) => item.symbol)
    .map((item) => ({
      symbol: item.symbol,
      name: item.longname || item.shortname || item.symbol,
      exchange: item.exchDisp || item.exchange || '',
      type: item.typeDisp || item.quoteType || '',
    }));
}

/* --------------------------------------------------------------- server */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

export function createServer({ root = resolve(HERE, '..', '..') } = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    try {
      if (path === '/api/quotes') {
        const symbols = (url.searchParams.get('symbols') || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        sendJson(res, 200, { quotes: await quotes(symbols), source: 'yahoo' });
        return;
      }
      if (path === '/api/chart') {
        const symbol = url.searchParams.get('symbol') || 'NVDA';
        const range = url.searchParams.get('range') || '1D';
        sendJson(res, 200, await chart(symbol, range));
        return;
      }
      if (path === '/api/search') {
        const query = url.searchParams.get('q') || '';
        sendJson(res, 200, { results: await search(query), source: 'yahoo' });
        return;
      }
      if (path === '/api/health') {
        sendJson(res, 200, { ok: true });
        return;
      }

      // static files: the built component and the demo page
      const relative = path === '/' ? '/demo/index.html' : path;
      const target = join(root, relative);
      if (!target.startsWith(root) || !existsSync(target)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
        return;
      }
      const body = await readFile(target);
      const extension = target.slice(target.lastIndexOf('.'));
      res.writeHead(200, {
        'Content-Type': MIME[extension] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(body);
    } catch (error) {
      sendJson(res, 500, { error: String((error && error.message) || error) });
    }
  });
}

export { quotes, chart, search };

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) {
  const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 8787;
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Glass Ticker data API on http://127.0.0.1:${port}`);
  });
}

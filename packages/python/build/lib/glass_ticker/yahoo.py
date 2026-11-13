"""Yahoo Finance client used by the Glass Ticker server.

The browser cannot call Yahoo directly (CORS), so every language binding
ships a small server that does the fetching. This is the Python one.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

RANGES: dict[str, tuple[str, str, tuple[str, ...]]] = {
    "1D": ("1d", "1m", ("2m", "5m")),
    "5D": ("5d", "15m", ("30m", "1h")),
    "1M": ("1mo", "1h", ("30m", "1d")),
    "3M": ("3mo", "1d", ("1wk",)),
    "6M": ("6mo", "1d", ("1wk",)),
    "YTD": ("ytd", "1d", ("1wk",)),
    "1Y": ("1y", "1d", ("1wk",)),
    "5Y": ("5y", "1wk", ("1mo",)),
    "MAX": ("max", "1mo", ("3mo",)),
}

LOGO_DOMAINS: dict[str, str] = {
    "AAPL": "apple.com",
    "MSFT": "microsoft.com",
    "GOOGL": "google.com",
    "AMZN": "amazon.com",
    "META": "meta.com",
    "TSLA": "tesla.com",
    "NVDA": "nvidia.com",
    "INFY": "infosys.com",
    "TCS": "tcs.com",
    "RELIANCE": "ril.com",
    "HDFCBANK": "hdfcbank.com",
    "ICICIBANK": "icicibank.com",
    "SBIN": "sbi.co.in",
    "ITC": "itcportal.com",
    "BHARTIARTL": "bhartiarthtel.com",
    "LT": "larsentoubro.com",
    "AXISBANK": "axisbank.com",
    "MARUTI": "marutisuzuki.com",
    "TATAMOTORS": "tatamotors.com",
    "ADANIENT": "adani.com",
    "WIPRO": "wipro.com",
    "HCLTECH": "hcltech.com",
    "BAJAJFINSV": "bajajfinserv.in",
    "KOTAKBANK": "kotak.com",
    "ONGC": "ongc.co.in",
    "NTPC": "ntpc.co.in",
    "POWERGRID": "powergrid.in",
    "TITAN": "titancompany.in",
    "ASIANPAINT": "asianpaint.com",
    "JSWSTEEL": "jswsteel.in",
    "COALINDIA": "coalindia.in",
    "SUNPHARMA": "sunpharma.com",
    "CIPLA": "cipla.com",
    "HINDUNILVR": "hindunilvr.com",
    "NESTLEIND": "nestleindia.in",
    "GRASIM": "grasim.com",
    "DRREDDY": "drreddys.com",
    "EICHERMOT": "eicher.in",
    "BRITANNIA": "britannia.co.in",
    "BPCL": "bpccindia.com",
    "IOC": "iocl.com",
    "HAL": "hal-india.co.in",
    "BEL": "bel.co.in",
    "VEDL": "vedl.com",
    "ZOMATO": "zomato.com",
    "PAYTM": "paytm.com",
    "NYKAA": "nykaa.com",
    "IRFC": "irfc.co.in",
    "DMART": "d-mart.com",
    "PIDILITIND": "pidilite.com",
    "SIEMENS": "siemens.com",
    "ABB": "abb.com",
    "SBILIFE": "sbilife.co.in",
    "HDFCLIFE": "hdfclife.com",
    "ICICIGI": "icicilomburgi.com",
    "BAJAJ-AUTO": "bajajauto.com",
    "M&M": "mahindra.com",
    "HEROMOTOCO": "heromotocorp.com",
    "DIVISLAB": "divislabs.com",
    "APOLLOHOSP": "apollohospitals.com",
    "TORNTPHARM": "torntpharma.com",
    "TECHM": "techmahindra.com",
    "LTIM": "ltimindtree.com",
    "POLYCAB": "polycabindia.com",
    "ASTRAL": "astralpipeline.com",
    "CUMMINSIND": "cumminsindia.com",
    "GAIL": "gailonline.com",
    "CANARA": "canarabank.com",
    "PNB": "pnbindia.in",
    "IDBI": "idbi.co.in",
    "FEDERALBK": "federalbank.co.in",
    "BANDHANBNK": "bandhanbank.in",
    "LICI": "licindia.in",
    "BTC-USD": "bitcoin.org",
    "ETH-USD": "ethereum.org",
    "SOL-USD": "solana.com",
    "XRP-USD": "ripple.com",
    "DOGE-USD": "dogecoin.com",
    "^NSEI": "nseindia.com",
    "^BSESN": "bseindia.com",
    "^NSEBANK": "nseindia.com",
    "^CNXIT": "nseindia.com",
}


class YahooError(RuntimeError):
    """Raised when Yahoo cannot be reached or refuses the request."""


def _num(value):
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result


def logo_for(symbol: str) -> str | None:
    """Favicon URL for a symbol, or None when it is unknown."""
    base = symbol.split(".")[0] if symbol.split(".")[-1].upper() in ("NS", "BO") else symbol
    domain = LOGO_DOMAINS.get(symbol) or LOGO_DOMAINS.get(base)
    if not domain:
        return None
    return f"https://www.google.com/s2/favicons?domain={urllib.parse.quote(domain)}&sz=64"


class YahooClient:
    """Small Yahoo Finance client with cookie handling and a crumb."""

    def __init__(self, timeout: float = 10.0, cache_ttl: float = 20.0) -> None:
        self.timeout = timeout
        self.cache_ttl = cache_ttl
        self._jar = CookieJar()
        self._opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self._jar)
        )
        self._crumb: str | None = None
        self._crumb_at = 0.0
        self._cache: dict[str, tuple[float, object]] = {}

    # ------------------------------------------------------------- plumbing

    def _open(self, url: str, headers: dict | None = None, accept: str = "application/json"):
        request_headers = {"User-Agent": USER_AGENT, "Accept": accept}
        if headers:
            request_headers.update(headers)
        request = urllib.request.Request(url, headers=request_headers)
        return self._opener.open(request, timeout=self.timeout)

    def _json(self, url: str) -> dict:
        with self._open(url) as response:
            return json.loads(response.read().decode("utf-8", errors="replace"))

    def _get_crumb(self) -> str:
        if self._crumb and (time.time() - self._crumb_at) < 1800:
            return self._crumb
        try:
            # The cookie endpoints refuse a JSON Accept header.
            self._open("https://fc.yahoo.com", accept="*/*").read()
        except Exception:  # noqa: BLE001 - the endpoint errors on purpose
            pass
        with self._open(
            "https://query1.finance.yahoo.com/v1/test/getcrumb", accept="*/*"
        ) as response:
            crumb = response.read().decode("utf-8", errors="replace").strip()
        if not crumb or crumb.startswith("{") or crumb.startswith("<"):
            raise YahooError("could not obtain a crumb")
        self._crumb = crumb
        self._crumb_at = time.time()
        return crumb

    def _cached(self, key: str, producer):
        hit = self._cache.get(key)
        if hit and (time.time() - hit[0]) < self.cache_ttl:
            return hit[1]
        value = producer()
        self._cache[key] = (time.time(), value)
        return value

    # ---------------------------------------------------------------- public

    def quotes(self, symbols: list[str]) -> list[dict]:
        """Latest quote for each symbol."""
        symbols = [s.strip() for s in symbols if s.strip()]
        if not symbols:
            return []
        return self._cached(
            "quotes:" + ",".join(symbols),
            lambda: self._quotes(symbols),
        )

    def _quotes(self, symbols: list[str]) -> list[dict]:
        try:
            return self._batch_quotes(symbols)
        except YahooError:
            # Yahoo's batch endpoint refuses requests now and then. The chart
            # endpoint has no such restriction, so rebuild the quote from it.
            quotes: list[dict] = []
            for symbol in symbols:
                try:
                    quotes.append(self._quote_from_chart(symbol))
                except YahooError:
                    continue
            if quotes:
                return quotes
            raise

    def _batch_quotes(self, symbols: list[str]) -> list[dict]:
        crumb = self._get_crumb()
        url = (
            "https://query1.finance.yahoo.com/v7/finance/quote?symbols="
            + urllib.parse.quote(",".join(symbols))
            + "&crumb="
            + urllib.parse.quote(crumb)
        )
        try:
            payload = self._json(url)
        except urllib.error.HTTPError:
            self._crumb = None
            crumb = self._get_crumb()
            url = (
                "https://query1.finance.yahoo.com/v7/finance/quote?symbols="
                + urllib.parse.quote(",".join(symbols))
                + "&crumb="
                + urllib.parse.quote(crumb)
            )
            payload = self._json(url)
        results = (payload.get("quoteResponse") or {}).get("result") or []
        if not results:
            raise YahooError("empty quote response")
        return [self._normalise(item) for item in results]

    def _normalise(self, item: dict) -> dict:
        return {
            "symbol": item.get("symbol"),
            "name": item.get("longName") or item.get("shortName") or item.get("symbol"),
            "exchange": item.get("fullExchangeName") or item.get("exchange") or "",
            "currency": item.get("currency"),
            "price": _num(item.get("regularMarketPrice")),
            "change": _num(item.get("regularMarketChange")),
            "changePercent": _num(item.get("regularMarketChangePercent")),
            "previousClose": _num(
                item.get("regularMarketPreviousClose") or item.get("previousClose")
            ),
            "open": _num(item.get("regularMarketOpen")),
            "dayHigh": _num(item.get("regularMarketDayHigh")),
            "dayLow": _num(item.get("regularMarketDayLow")),
            "volume": _num(item.get("regularMarketVolume")),
            "marketCap": _num(item.get("marketCap")),
            "trailingPE": _num(item.get("trailingPE")),
            "dividendYield": _num(item.get("dividendYield")),
            "week52High": _num(item.get("fiftyTwoWeekHigh")),
            "week52Low": _num(item.get("fiftyTwoWeekLow")),
            "marketState": item.get("marketState") or "CLOSED",
            "logoUrl": logo_for(item.get("symbol") or ""),
        }

    def _quote_from_chart(self, symbol: str) -> dict:
        payload = self._json(
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            + urllib.parse.quote(symbol)
            + "?range=1d&interval=1m&includePrePost=true"
        )
        result = (payload.get("chart") or {}).get("result") or []
        if not result:
            raise YahooError(f"no data for {symbol}")
        meta = result[0].get("meta") or {}
        price = _num(meta.get("regularMarketPrice"))
        previous_close = _num(meta.get("previousClose") or meta.get("chartPreviousClose"))
        change = price - previous_close if price is not None and previous_close else None
        return {
            "symbol": meta.get("symbol") or symbol,
            "name": meta.get("longName") or meta.get("shortName") or symbol,
            "exchange": meta.get("fullExchangeName") or meta.get("exchangeName") or "",
            "currency": meta.get("currency"),
            "price": price,
            "change": change,
            "changePercent": (
                (change / previous_close) * 100 if change is not None and previous_close else None
            ),
            "previousClose": previous_close,
            "open": _num(meta.get("regularMarketOpen")),
            "dayHigh": _num(meta.get("regularMarketDayHigh")),
            "dayLow": _num(meta.get("regularMarketDayLow")),
            "volume": _num(meta.get("regularMarketVolume")),
            "marketCap": None,
            "trailingPE": None,
            "dividendYield": None,
            "week52High": _num(meta.get("fiftyTwoWeekHigh")),
            "week52Low": _num(meta.get("fiftyTwoWeekLow")),
            "marketState": meta.get("marketState") or "CLOSED",
            "logoUrl": logo_for(symbol),
        }

    def chart(self, symbol: str, range_key: str = "1D") -> dict:
        """Price series for a symbol."""
        key = range_key.upper()
        yahoo_range, interval, fallbacks = RANGES.get(key, RANGES["1D"])
        last_error: Exception | None = None
        for candidate in (interval, *fallbacks):
            try:
                payload = self._json(
                    "https://query1.finance.yahoo.com/v8/finance/chart/"
                    + urllib.parse.quote(symbol)
                    + f"?range={yahoo_range}&interval={candidate}&includePrePost=true"
                )
                result = (payload.get("chart") or {}).get("result") or []
                if not result:
                    continue
                meta = result[0].get("meta") or {}
                stamps = result[0].get("timestamp") or []
                closes = (
                    ((result[0].get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
                )
                points = [
                    [stamp, close]
                    for stamp, close in zip(stamps, closes)
                    if close is not None
                ]
                return {
                    "symbol": symbol,
                    "range": key,
                    "points": points,
                    "previousClose": _num(meta.get("previousClose") or meta.get("chartPreviousClose")),
                    "currency": meta.get("currency"),
                    "marketState": meta.get("marketState") or "REGULAR",
                }
            except Exception as exc:  # noqa: BLE001 - try the next interval
                last_error = exc
        raise YahooError(f"no chart data for {symbol}: {last_error}")

    def search(self, query: str, limit: int = 8) -> list[dict]:
        """Symbol search."""
        payload = self._json(
            "https://query1.finance.yahoo.com/v1/finance/search?q="
            + urllib.parse.quote(query)
            + f"&quotesCount={limit}&newsCount=0"
        )
        results = []
        for item in payload.get("quotes") or []:
            symbol = item.get("symbol")
            if not symbol:
                continue
            results.append(
                {
                    "symbol": symbol,
                    "name": item.get("longname") or item.get("shortname") or symbol,
                    "exchange": item.get("exchDisp") or item.get("exchange") or "",
                    "type": item.get("typeDisp") or item.get("quoteType") or "",
                }
            )
            if len(results) >= limit:
                break
        return results

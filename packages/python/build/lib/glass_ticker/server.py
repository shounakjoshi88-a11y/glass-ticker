"""A tiny HTTP server that feeds the Glass Ticker component.

    from glass_ticker.server import TickerServer

    with TickerServer() as server:
        print(server.url)          # http://127.0.0.1:8787

Endpoints:

    GET /api/quotes?symbols=NVDA,AAPL
    GET /api/chart?symbol=NVDA&range=1D
    GET /api/search?q=tesla
    GET /                    a ready-made page with the component in it
"""

from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .yahoo import YahooClient, YahooError

DEFAULT_COMPONENT_URL = "https://unpkg.com/@glass-ticker/core/dist/glass-ticker.js"

PAGE_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Glass Ticker</title>
<style>
  html, body {{ margin: 0; height: 100%; background: #08080a; }}
  glass-ticker {{ display: block; height: 100%; }}
</style>
</head>
<body>
<glass-ticker id="ticker"
  symbols="{symbols}"
  symbol="{symbol}"
  range="{range}"
  theme="{theme}"
  endpoint="{endpoint}"></glass-ticker>
<script type="module" src="{component}"></script>
</body>
</html>
"""


class _Handler(BaseHTTPRequestHandler):
    server_version = "GlassTicker/2.5"

    # set by TickerServer
    client: YahooClient
    component_url: str
    page_symbols: str
    page_symbol: str
    page_range: str
    page_theme: str

    def log_message(self, *_args):  # quieter output
        pass

    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, payload: dict, status: int = 200) -> None:
        self._send(
            status,
            json.dumps(payload).encode("utf-8"),
            "application/json; charset=utf-8",
        )

    def do_OPTIONS(self) -> None:  # noqa: N802 - http.server API
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 - http.server API
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        try:
            if parsed.path == "/api/quotes":
                symbols = [
                    part.strip()
                    for part in (query.get("symbols", [""])[0]).split(",")
                    if part.strip()
                ]
                self._json({"quotes": self.client.quotes(symbols), "source": "yahoo"})
                return

            if parsed.path == "/api/chart":
                symbol = query.get("symbol", ["NVDA"])[0]
                range_key = query.get("range", ["1D"])[0]
                self._json(self.client.chart(symbol, range_key))
                return

            if parsed.path == "/api/search":
                text = query.get("q", [""])[0]
                self._json({"results": self.client.search(text), "source": "yahoo"})
                return

            if parsed.path == "/api/health":
                self._json({"ok": True})
                return

            if parsed.path in ("/", "/index.html"):
                page = PAGE_TEMPLATE.format(
                    symbols=self.page_symbols,
                    symbol=self.page_symbol,
                    range=self.page_range,
                    theme=self.page_theme,
                    endpoint="",
                    component=self.component_url,
                )
                self._send(200, page.encode("utf-8"), "text/html; charset=utf-8")
                return

            self._json({"error": "not found"}, 404)
        except YahooError as error:
            self._json({"error": str(error)}, 502)
        except Exception as error:  # noqa: BLE001 - never kill the server
            self._json({"error": str(error)}, 500)


class TickerServer:
    """Runs the data API in a background thread.

    Use it as a context manager, or call :meth:`start` / :meth:`stop`.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 8787,
        symbols: str = "NVDA,AAPL,MSFT,TSLA",
        symbol: str = "NVDA",
        range_key: str = "1D",
        theme: str = "carbon",
        component_url: str = DEFAULT_COMPONENT_URL,
        client: YahooClient | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.symbols = symbols
        self.symbol = symbol
        self.range_key = range_key
        self.theme = theme
        self.component_url = component_url
        self.client = client or YahooClient()
        self._httpd: ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None

    @property
    def url(self) -> str:
        """Base URL of the running server."""
        port = self._httpd.server_address[1] if self._httpd else self.port
        return f"http://{self.host}:{port}"

    def start(self) -> "TickerServer":
        handler = type(
            "BoundHandler",
            (_Handler,),
            {
                "client": self.client,
                "component_url": self.component_url,
                "page_symbols": self.symbols,
                "page_symbol": self.symbol,
                "page_range": self.range_key,
                "page_theme": self.theme,
            },
        )
        self._httpd = ThreadingHTTPServer((self.host, self.port), handler)
        self._httpd.daemon_threads = True
        self._thread = threading.Thread(target=self._httpd.serve_forever, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        if self._httpd is not None:
            self._httpd.shutdown()
            self._httpd.server_close()
            self._httpd = None
        if self._thread is not None:
            self._thread.join(timeout=3)
            self._thread = None

    def __enter__(self) -> "TickerServer":
        return self.start()

    def __exit__(self, *_exc) -> None:
        self.stop()


def iframe_html(url: str, height: int = 480, width: str = "100%") -> str:
    """An iframe snippet that embeds a running Glass Ticker server."""
    return (
        f'<iframe src="{url}" width="{width}" height="{height}" '
        'style="border:0;border-radius:14px;overflow:hidden" '
        'title="Glass Ticker" loading="lazy"></iframe>'
    )

"""Glass Ticker - a frameless acrylic desktop market ticker for Windows.

Two things live in this package:

* the desktop app installer (:func:`ensure_installed`)
* an embeddable data server (:class:`TickerServer`) so the ticker can be
  dropped into any Python application
"""

from __future__ import annotations

from .installer import (
    REPO,
    ensure_installed,
    executable_path,
    fetch_manifest,
    install_dir,
)
from .server import TickerServer, iframe_html
from .yahoo import YahooClient, YahooError

__version__ = "2.7.0"

__all__ = [
    "__version__",
    "REPO",
    "ensure_installed",
    "executable_path",
    "fetch_manifest",
    "install_dir",
    "TickerServer",
    "iframe_html",
    "YahooClient",
    "YahooError",
]

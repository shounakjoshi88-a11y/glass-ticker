"""Glass Ticker - a frameless acrylic desktop market ticker for Windows."""

from __future__ import annotations

from .installer import (
    REPO,
    ensure_installed,
    executable_path,
    fetch_manifest,
    install_dir,
)

__version__ = "2.4.0"

__all__ = [
    "__version__",
    "REPO",
    "ensure_installed",
    "executable_path",
    "fetch_manifest",
    "install_dir",
]

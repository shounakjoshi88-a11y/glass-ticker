"""Glass Ticker - installer and launcher for the Windows desktop app."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

__all__ = ["__version__", "REPO", "MANIFEST_URL", "install_dir", "executable_path", "ensure_installed"]

__version__ = "2.0.0"

REPO = "shounakjoshi88-a11y/glass-ticker"
RELEASE_BASE = f"https://github.com/{REPO}/releases/latest/download"
MANIFEST_URL = f"{RELEASE_BASE}/release.json"
USER_AGENT = "glass-ticker-pypi"
CHUNK = 1024 * 256


def install_dir() -> Path:
    """Where the downloaded executable lives."""
    override = os.environ.get("GLASS_TICKER_HOME")
    if override:
        return Path(override)
    base = os.environ.get("LOCALAPPDATA") or str(Path.home() / ".local" / "share")
    return Path(base) / "GlassTicker"


def executable_path() -> Path:
    return install_dir() / "GlassTicker.exe"


def _open(url: str, timeout: int = 60):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    return urllib.request.urlopen(request, timeout=timeout)  # noqa: S310 - fixed https hosts


def fetch_manifest() -> dict:
    with _open(MANIFEST_URL) as response:
        return json.loads(response.read().decode("utf-8"))


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(CHUNK), b""):
            digest.update(block)
    return digest.hexdigest()


def _download(url: str, target: Path, attempts: int = 3) -> None:
    """Download with a couple of retries - the binary is ~70 MB."""
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with _open(url) as response, target.open("wb") as handle:
                shutil.copyfileobj(response, handle, CHUNK)
            return
        except (urllib.error.URLError, OSError) as error:
            last_error = error
            if attempt < attempts - 1:
                time.sleep(2 * (attempt + 1))
    raise last_error if last_error else OSError("download failed")


def is_installed(manifest: dict | None = None) -> bool:
    target = executable_path()
    if not target.exists():
        return False
    if manifest and manifest.get("size") and target.stat().st_size != manifest["size"]:
        return False
    if manifest and manifest.get("sha256"):
        return _sha256(target) == str(manifest["sha256"]).lower()
    return True


def ensure_installed(quiet: bool = False) -> Path | None:
    """Download and verify the executable. Returns None off Windows."""
    if not sys.platform.startswith("win"):
        if not quiet:
            print(f"[glass-ticker] Windows only - skipping download on {sys.platform}")
        return None

    install_dir().mkdir(parents=True, exist_ok=True)

    manifest: dict | None = None
    try:
        manifest = fetch_manifest()
    except (urllib.error.URLError, OSError, ValueError) as error:
        if not quiet:
            print(f"[glass-ticker] release manifest unavailable: {error}")

    if is_installed(manifest):
        if not quiet:
            print(f"[glass-ticker] ready at {executable_path()}")
        return executable_path()

    url = (manifest or {}).get("url") or f"{RELEASE_BASE}/GlassTicker.exe"
    if not quiet:
        print("[glass-ticker] downloading Glass Ticker...")

    handle, temp_name = tempfile.mkstemp(dir=str(install_dir()), suffix=".download")
    os.close(handle)
    temp = Path(temp_name)
    try:
        _download(url, temp)
        if manifest and manifest.get("sha256"):
            if _sha256(temp) != str(manifest["sha256"]).lower():
                raise ValueError("checksum mismatch - download rejected")
        shutil.move(str(temp), str(executable_path()))
    finally:
        if temp.exists():
            temp.unlink()

    if not quiet:
        print(f"[glass-ticker] installed to {executable_path()}")
    return executable_path()

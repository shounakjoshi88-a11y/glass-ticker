"""Command line entry point for the glass-ticker package."""

from __future__ import annotations

import argparse
import subprocess
import sys

from . import __version__
from .installer import ensure_installed, executable_path, install_dir
from .server import TickerServer


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="glass-ticker",
        description="Glass Ticker - a frameless acrylic desktop market ticker for Windows",
    )
    parser.add_argument(
        "command",
        nargs="?",
        default="launch",
        choices=["launch", "install", "path", "version", "serve"],
        help="what to do (default: launch)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="do not print progress messages",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8787,
        help="port for the embeddable data server",
    )
    parser.add_argument(
        "--symbols",
        default="NVDA,AAPL,MSFT,TSLA",
        help="comma separated symbols for the server page",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    if args.command == "version":
        print(__version__)
        return 0
    if args.command == "path":
        print(executable_path())
        return 0
    if args.command == "serve":
        server = TickerServer(port=args.port, symbols=args.symbols)
        server.start()
        print(f"Glass Ticker data API on {server.url}")
        print(f"Embed with: {server.url}")
        try:
            while True:
                import time

                time.sleep(3600)
        except KeyboardInterrupt:
            server.stop()
        return 0
    if args.command == "install":
        try:
            ensure_installed(quiet=args.quiet)
        except Exception as error:  # noqa: BLE001 - CLI boundary
            print(f"[glass-ticker] install failed: {error}", file=sys.stderr)
            return 1
        return 0

    try:
        target = ensure_installed(quiet=args.quiet)
    except Exception as error:  # noqa: BLE001 - CLI boundary
        print(f"[glass-ticker] {error}", file=sys.stderr)
        return 1
    if target is None:
        print("Glass Ticker only runs on Windows.", file=sys.stderr)
        return 1

    subprocess.Popen([str(target)], close_fds=True)
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

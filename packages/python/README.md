# glass-ticker (PyPI)

Installs and launches [Glass Ticker](https://github.com/shounakjoshi88-a11y/glass-ticker),
a frameless acrylic desktop market ticker for Windows.

```bash
pip install glass-ticker
glass-ticker
```

## Commands

| Command | What it does |
| --- | --- |
| `glass-ticker` | launch the app |
| `glass-ticker install` | download the executable without launching |
| `glass-ticker path` | print where the executable lives |
| `glass-ticker version` | print the package version |

`glassticker` is installed as an alias for the same entry point.

## How the download works

The package fetches `release.json` from the latest GitHub release, downloads
`GlassTicker.exe`, and verifies it against the SHA-256 published in that
manifest. A mismatched download is deleted rather than executed. If the machine
is offline the install still succeeds - the launcher retries the download the
first time it runs.

The executable is stored in `%LOCALAPPDATA%\GlassTicker` (override with
`GLASS_TICKER_HOME`).

## License

MIT

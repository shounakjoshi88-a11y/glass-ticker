# glass-ticker (npm)

Installs and launches [Glass Ticker](https://github.com/shounakjoshi88-a11y/glass-ticker),
a frameless acrylic desktop market ticker for Windows.

The npm package is a thin wrapper - it downloads the signed-hash Windows
executable from the GitHub release and gives you the `glassticker` command.

```bash
npm install -g glass-ticker
glassticker
```

## Commands

| Command | What it does |
| --- | --- |
| `glassticker` | launch the app |
| `glassticker install` | download the executable without launching |
| `glassticker path` | print where the executable lives |
| `glassticker --version` | print the package version |

## How the download works

`postinstall` fetches `release.json` from the latest GitHub release, downloads
`GlassTicker.exe`, and verifies it against the SHA-256 published in that
manifest. A mismatched download is deleted rather than executed. If the machine
is offline the install still succeeds - the launcher retries the download the
first time it runs.

The executable is stored in `%LOCALAPPDATA%\GlassTicker` (override with
`GLASS_TICKER_HOME`).

## License

MIT

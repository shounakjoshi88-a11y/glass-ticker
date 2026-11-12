# Glass Ticker

A frameless, acrylic-glass desktop market ticker for Windows. It lives in a
small always-on-top window instead of a browser tab, so prices stay visible
while you work.

![Glass Ticker](icon.png)

## What it does

- **Watchlist** with live sparklines across NSE/BSE indices, Indian and US
  equities, and crypto (`^NSEI`, `RELIANCE.NS`, `AAPL`, `BTC-USD`, ...)
- **Interactive chart** for the selected symbol with range switching, area or
  candle style, and an optional SMA overlay
- **Price alerts** with native Windows notifications
- **Portfolio positions** - quantity and average cost per symbol, with live
  day change and P&L grouped by currency
- **Window control** - always on top, opacity slider, start at login, system
  tray, and the `Ctrl+Shift+G` global hotkey
- **Personalisation** - accent colour, sorting, solo mode, and JSON backup
  export/import
- Everything is stored locally (`localStorage` plus a small window-bounds file)

## Data source

Quotes and charts come from Yahoo Finance's public endpoints. The renderer is
locked down by a strict Content Security Policy and can only reach the
main process through a preload bridge; the main process allowlists the Yahoo
hosts before fetching.

Prices are near-real-time but Yahoo can delay some feeds by up to 15 minutes,
so treat the number as an indication rather than a tick.

## Build from source

```bash
npm install
npm start          # run the app
npm run dist       # build dist/GlassTicker.exe (portable, x64)
```

The Windows build needs to run on Windows. `electron-builder` uses `rcedit`
to embed `build/icon.ico` into the executable, and that tool is only
available in the Windows build of `electron-builder`. A build produced on
Linux still works, but Windows Explorer shows a generic icon for it.

## Releases

`.github/workflows/build.yml` builds the portable executable on
`windows-latest` for every push to `main` and uploads it as a workflow
artifact. Push a `v*` tag and the same executable is attached to the GitHub
release automatically:

```bash
git tag v2.0.0
git push origin v2.0.0
```

The executable is **not code-signed**, so Windows SmartScreen shows a
warning the first time you run it. Choose *More info* -> *Run anyway*.

## Known limits in this round

- A single watchlist - no multiple watchlist tabs yet
- Dark theme only, no light theme
- No drag-to-reorder of watchlist rows
- No mini ticker-strip mode
- Alerts are absolute price targets, not percentage moves
- Portfolio totals are shown per currency, with no currency conversion

## License

MIT

# Glass Ticker

A frameless, acrylic-glass desktop market ticker for Windows. It lives in a
small always-on-top window instead of a browser tab, so prices stay visible
while you work.

![Glass Ticker](icon.png)

## Install

The app is a single portable executable - no installer, no runtime to set up.

**winget** (once the manifest is merged upstream)

```powershell
winget install ShounakJoshi.GlassTicker
```

**Scoop**

```powershell
scoop bucket add glass-ticker https://github.com/shounakjoshi88-a11y/scoop-bucket
scoop install glass-ticker
```

**npm** - the wrapper downloads the executable and gives you `glassticker`

```bash
npm install -g glass-ticker
glassticker
```

**pip / PyPI** - same idea, gives you `glass-ticker`

```bash
pip install glass-ticker
glass-ticker
```

**Maven** - a launcher jar for JVM projects

```bash
mvn dependency:get -Dartifact=io.github.shounakjoshi88:glass-ticker-launcher:2.0.0
java -jar ~/.m2/repository/io/github/shounakjoshi88/glass-ticker-launcher/2.0.0/glass-ticker-launcher-2.0.0.jar
```

**Direct download**

Grab `GlassTicker.exe` from the
[releases page](https://github.com/shounakjoshi88-a11y/glass-ticker/releases).
Each release also publishes `release.json` with the binary's SHA-256 and
`GlassTicker.exe.sha256` for command line checks.

**GitHub Packages** - every tag also publishes the npm and Maven wrappers to
this repository's own package registry:

```bash
npm install @shounakjoshi88-a11y/glass-ticker --registry=https://npm.pkg.github.com
```

```xml
<dependency>
  <groupId>com.github.shounakjoshi88</groupId>
  <artifactId>glass-ticker-launcher</artifactId>
  <version>2.3.0</version>
</dependency>
```

All the language wrappers fetch `release.json` first and verify the download
against that hash - a mismatched file is deleted instead of executed.

## What it does

- **Company logos, discovered automatically** - provider logo, then the issuer
  website favicon, then a monogram fallback. Cached locally for a week so the
  list does not re-fetch on every refresh
- **Watchlist tabs** with live sparklines across NSE/BSE indices, Indian and US
  equities, and crypto (`^NSEI`, `RELIANCE.NS`, `AAPL`, `BTC-USD`, ...)
- **Interactive chart** for the selected symbol with range switching, area or
  candle style, and an optional SMA overlay
- **Alerts on price targets or percentage moves**, with native Windows
  notifications
- **Portfolio positions** - quantity and average cost per symbol, with live
  day change and P&L, plus a **currency converter** for the totals
- **Mini ticker-strip mode** for a single line of scrolling quotes
- **Light and dark themes**, drag-to-reorder rows, and per-row sorting
- **Window control** - always on top, opacity slider, start at login, system
  tray, maximize, and the `Ctrl+Shift+G` global hotkey
- Everything is stored locally (`localStorage` plus a small window-bounds file)

## Data source

Quotes and charts come from Yahoo Finance's public endpoints. The renderer is
locked down by a strict Content Security Policy and can only reach the
main process through a preload bridge; the main process allowlists the Yahoo
hosts before fetching.

Prices are near-real-time but Yahoo can delay some feeds by up to 15 minutes,
so treat the number as an indication rather than a tick.

## Repository layout

```
index.html, main.js, preload.js     the app
icon.png, build/icon.ico            icons
pom.xml, src/                       Maven launcher module
packaging/winget/                   winget-pkgs manifest (submitted upstream)
packaging/scoop/                    scoop bucket (published as its own repo)
packages/npm/glass-ticker/          npm wrapper package
packages/python/                    PyPI wrapper package
tools/check-exe-icon.ps1            verifies the icon is embedded in a built exe
```

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

## Known limits

- Windows only - there is no macOS or Linux build
- The executable is not code-signed, so SmartScreen warns on first run
- Quotes come from Yahoo's public feed and can be delayed up to 15 minutes on
  some exchanges
- Company logos come from a third-party favicon service, so a symbol with no
  known issuer falls back to a monogram

## License

MIT

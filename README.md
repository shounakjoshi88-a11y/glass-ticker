# Glass Ticker

[![release](https://img.shields.io/github/v/release/shounakjoshi88-a11y/glass-ticker?color=E8946F&label=release)](https://github.com/shounakjoshi88-a11y/glass-ticker/releases)
[![license](https://img.shields.io/github/license/shounakjoshi88-a11y/glass-ticker?color=E8946F)](LICENSE)
![platforms](https://img.shields.io/badge/platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20iOS%20%7C%20Android-E8946F)

A market ticker that lives on the desktop instead of in a browser tab. Frameless,
always on top - prices stay visible while you work.

Two looks ship in the same binary: **Liquid Glass**, where the panels refract a
slow fluid backdrop, and **Carbon**, the flat graphite design. One button swaps
them.

It is not only the desktop app. The same UI ships as a **native iOS app**, a
**native Android app**, and an **embeddable web component** (`<glass-ticker>`)
for anything else, with the same look and the same data.

![Glass Ticker](icon.png)

## Install

| Platform | What you get | How |
| --- | --- | --- |
| **Windows** | portable `.exe`, no installer | download it, `scoop install glass-ticker`, or `winget install ShounakJoshi.GlassTicker` once the manifest merges |
| **macOS** (Apple silicon) | `.dmg` and `.zip` | download, drag to Applications |
| **Linux** (amd64) | `.AppImage` and `.deb` | `chmod +x GlassTicker-*.AppImage && ./GlassTicker-*.AppImage` |
| **iOS / iPadOS** | native `SwiftUI` app | `GlassTicker-ios.app.zip` - sideload it |
| **Android** (8.0+) | native Kotlin `APK` | `GlassTicker-android.apk` - install it directly |

Everything is on the [releases page](https://github.com/shounakjoshi88-a11y/glass-ticker/releases).
Each release also carries `release.json` with the executable's SHA-256 and a
`GlassTicker.exe.sha256` for command line checks.

```powershell
# Windows, Scoop
scoop bucket add glass-ticker https://github.com/shounakjoshi88-a11y/scoop-bucket
scoop install glass-ticker

# Windows, winget - the manifest is still in review upstream, so fall back to
# the executable until microsoft/winget-pkgs#478711 is merged
winget install ShounakJoshi.GlassTicker
```

```bash
# macOS
open GlassTicker-3.1.1-arm64.dmg

# Linux
sudo dpkg -i glass-ticker_3.1.1_amd64.deb
```

None of the desktop binaries are code-signed, so Windows SmartScreen and macOS
Gatekeeper warn on first run. On Windows choose *More info* -> *Run anyway*; on
macOS right click the app -> *Open*.

## Use it as a package

The ticker is built as packages as well as an app, so the same UI can go into a
Python service, a Java backend, a React app or a page with no framework at all.

| Stack | Package | Install (works today) |
| --- | --- | --- |
| Any web app | `@glass-ticker/core` | `npm i .../v3.1.1/glass-ticker-core-3.1.1.tgz` |
| React | `@glass-ticker/react` | `npm i .../v3.1.1/glass-ticker-react-3.1.1.tgz` |
| Vue | `@glass-ticker/vue` | `npm i .../v3.1.1/glass-ticker-vue-3.1.1.tgz` |
| Node backend | `@glass-ticker/server` | `npm i .../v3.1.1/glass-ticker-server-3.1.1.tgz` |
| Desktop launcher | `glass-ticker` | `npm i .../v3.1.1/glass-ticker-3.1.1.tgz` |
| Python | `glass-ticker` | `pip install .../v3.1.1/glass_ticker-3.1.1-py3-none-any.whl` |
| Java / JVM | `glass-ticker-launcher` | `java -jar glass-ticker-launcher-3.1.1.jar` |

The `...` is
`https://github.com/shounakjoshi88-a11y/glass-ticker/releases/download`
- spelled out:

```bash
base=https://github.com/shounakjoshi88-a11y/glass-ticker/releases/download/v3.1.1

npm install "$base/glass-ticker-core-3.1.1.tgz"      # or -react, -vue, -server
pip install "$base/glass_ticker-3.1.1-py3-none-any.whl"
curl -LO "$base/glass-ticker-launcher-3.1.1.jar"
```

There are three distribution channels and they are not at the same stage:

- **Release assets** - attached to every tag, install with the commands above.
  This is the one that works with no account and no token.
- **GitHub Packages** - every tag publishes the scoped npm packages and the
  Maven artifact to this repository's registry. They are private by default,
  so they need a `read:packages` token. `PACKAGES_TOKEN` in CI or *Change
  visibility -> Public* in the Packages tab flips that.
- **npmjs, PyPI and Maven Central** - the publish steps exist in
  `.github/workflows/publish-packages.yml` and run as soon as `NPM_TOKEN`,
  `PYPI_PASSWORD` and `CENTRAL_TOKEN` are added as repository secrets. Until
  then those names are unclaimed, so `npm i @glass-ticker/core` and
  `pip install glass-ticker` will 404.

The npm and Python launchers fetch `release.json` first and verify the download
against its hash - a mismatched file is deleted instead of executed.

## Drop the component into a page

```html
<script type="module" src="/node_modules/@glass-ticker/core/dist/glass-ticker.js"></script>

<glass-ticker symbols="NVDA,AAPL,TSLA" symbol="NVDA" endpoint="/api"></glass-ticker>
```

A browser cannot call Yahoo directly (CORS), so the component reads from a tiny
data API. Every binding ships the same three endpoints:

```
GET /api/quotes?symbols=NVDA,AAPL
GET /api/chart?symbol=NVDA&range=1D
GET /api/search?q=tesla
```

Start it with `npx glass-ticker-server`, `glass-ticker serve`, or
`java -jar glass-ticker-launcher.jar` - or point `endpoint` at your own backend.
Full usage for every stack is in [`packages/core/README.md`](packages/core/README.md),
and a live demo is in [`demo/`](demo/).

## What it does

- **Two themes, switched live** - Liquid Glass by default, Carbon when you want
  the flat one; the island and pinned widgets follow along
- **Dynamic island** - a pill that docks at the top of the screen and expands
  on hover, carrying live quotes and alert actions. Right click it to send it
  behind the other windows, bring it back in front, or park it in any corner.
  Drag it to move it anywhere, and `Ctrl+Shift+I` brings it forward even when it
  is buried behind another app
- **Pinnable desktop widget** - drag the chart out of the window and it pins as
  a small always-on-top widget anywhere on the desktop, still receiving live data
- **Company logos, discovered automatically** - provider logo, then the issuer
  website favicon, then a monogram fallback. Cached locally for a week so the
  list does not re-fetch on every refresh
- **Watchlist tabs** with live sparklines across NSE/BSE indices, Indian and US
  equities, and crypto (`^NSEI`, `RELIANCE.NS`, `AAPL`, `BTC-USD`, ...)
- **Interactive chart** for the selected symbol with range switching, area or
  candle style, an optional SMA overlay and RSI
- **Alerts on price targets or percentage moves**, with native notifications
- **Portfolio positions** - quantity and average cost per symbol, with live day
  change and P&L, plus a **currency converter** for the totals
- **Mini ticker-strip mode** for a single line of scrolling quotes
- **Light and dark themes**, drag-to-reorder rows, and sorting by change
- **Window control** - always on top, opacity slider, start at login, system
  tray, maximize, and the `Ctrl+Shift+G` global hotkey
- Everything is stored locally (`localStorage` plus a small window-bounds file)

The window chrome adapts to the platform: the Windows 11 acrylic backdrop on
Windows, the macOS vibrancy material on macOS, and a transparent window where
the CSS glass does the work on Linux.

## Two themes, one button apart

**Liquid Glass** is the default. The panels do not just blur, they bend: an SVG
displacement lens refracts the fluid backdrop behind each card, so the light
drags as the window moves. Sliders have a liquid thumb with a spring anchor, the
segmented controls glide instead of snapping, buttons answer with a press ripple
and a pointer light follows the cursor across the surface.

**Carbon** is the flat one - the original graphite design with a single accent
colour, hard edges, and none of the animation. It is the theme for reading a
number without any glass in the way, and for machines where the GPU should stay
idle.

Switch with the glass/carbon button in the toolbar, or Preferences -> Style. The
choice is written to `localStorage` and the dynamic island and pinned widgets
pick it up immediately, without a restart. The Glass, Liquid light and slider
controls in Preferences are greyed out under Carbon because only the glass theme
uses them.

## The mobile apps are native

Neither phone build wraps a web view, and neither needs a server running next to
it: they call Yahoo straight from the device, so there is no CORS in the way.

### iOS - SwiftUI

The watchlist, the chart (Swift Charts), the range picker, the statistics and the
search are all native SwiftUI. Source in [`ios/`](ios/); the Xcode project is
generated from `ios/project.yml` with
[XcodeGen](https://github.com/yonaskolb/XcodeGen), so there is no `.pbxproj` to
merge by hand.

```bash
brew install xcodegen
cd ios && xcodegen generate && open GlassTicker.xcodeproj
```

CI builds it on `macos-latest` with real Xcode on every tag and attaches the
`.app` to the release. That build is **unsigned**, so to run it on a device you
either sign it with your own Apple Developer certificate - add
`APPLE_CERTIFICATE_P12_BASE64`, `APPLE_PROVISIONING_PROFILE_BASE64` and
`APPLE_TEAM_ID` as repository secrets and CI will emit a signed `.ipa` - or
sideload the unsigned app with AltStore or Sideloadly.

### Android - Kotlin + Compose

Watchlist, a Canvas price chart, the range picker, the statistics and the
search, all in Jetpack Compose. Source in [`android/`](android/).

```bash
cd android
gradle assembleRelease     # needs Gradle 8.11.1 and the Android SDK
```

CI does the same thing through `gradle/actions/setup-gradle`, so there is no
Gradle wrapper to keep in the repository.

The APK is signed with the keystore in `android/app/keystore/`. That key is
**published on purpose**: Android refuses to upgrade an installed app signed
with a different key, so a fresh key per build would break every existing
install. It is a sideload key - for Play you need your own.

## Data source

Quotes and charts come from Yahoo Finance's public endpoints. On the desktop the
renderer is locked down by a strict Content Security Policy and can only reach
the main process through a preload bridge; the main process allowlists the Yahoo
hosts before fetching. The phone apps and the package servers fetch the same
endpoints directly.

Prices are near-real-time but Yahoo delays some feeds by up to 15 minutes, so
treat the number as an indication rather than a tick.

## Repository layout

```
index.html, main.js, preload.js     the Electron app
island.html, widget.html           the dynamic island and the pinned widget
icon.png, build/icon.ico           icons
pom.xml, src/                      Maven launcher + embeddable data server
ios/                               native SwiftUI app + XcodeGen spec
android/                           native Kotlin app (Compose)
packages/core/                     the embeddable web component
packages/react/                    React wrapper
packages/vue/                      Vue wrapper
packages/server/                   reference data API for Node
packages/npm/glass-ticker/         npm wrapper for the desktop app
packages/python/                   PyPI wrapper + embeddable data server
packaging/winget/                  winget-pkgs manifest (submitted upstream)
packaging/scoop/                   scoop bucket (published as its own repo)
tools/check-exe-icon.ps1           verifies the icon is embedded in a built exe
demo/                              live demo for the component
```

## Build from source

```bash
npm install
npm start          # run the app
npm run dist       # build the portable dist/GlassTicker.exe
```

The Windows build has to run on Windows. `electron-builder` uses `rcedit` to
embed `build/icon.ico` into the executable, and that tool only exists in the
Windows build of `electron-builder`. A build produced on Linux still runs, but
Explorer shows a generic icon for it.

## Releases

`.github/workflows/build.yml` builds the portable executable on
`windows-latest` for every push to `main` and uploads it as a workflow artifact.
A `v*` tag builds all three desktop targets, the iOS app and the Android APK,
and attaches them, the package tarballs, the wheel and the launcher jar to the
release:

```bash
git tag v3.1.1
git push origin v3.1.1
```

Every version number lives in one place per platform - `package.json` for the
desktop app, `ios/project.yml` for iOS, `android/app/build.gradle.kts` for
Android - and a release is only correct when all of them, plus the manifests in
`packaging/`, name the same version.

## Known limits

- The desktop binaries are not code-signed, so Windows SmartScreen and macOS
  Gatekeeper both warn on first run
- The iOS build is unsigned: running it on a device needs your own Apple
  Developer account, or a sideloading tool
- The winget manifest is still in review at microsoft/winget-pkgs#478711, so
  `winget install` does not resolve yet - Scoop and the direct download work
- npmjs, PyPI and Maven Central are not published: the workflow is ready and
  waits on the registry tokens. Use the release assets meanwhile
- The macOS `.dmg` and `.zip` are arm64 only, built on Apple silicon runners
- Quotes come from Yahoo's public feed and can be delayed up to 15 minutes on
  some exchanges
- Company logos come from a third-party favicon service, so a symbol with no
  known issuer falls back to a monogram
- Start at login is wired up on Windows and macOS only

## License

MIT

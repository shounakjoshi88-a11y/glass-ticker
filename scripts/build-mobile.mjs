/**
 * Builds the mobile web assets from the desktop sources.
 *
 * The iOS app runs the same interface as the desktop app. The only thing
 * that changes is the bridge: Electron exposes `api.get` through its
 * preload, while Capacitor provides CapacitorHttp, which proxies the
 * request natively and so sidesteps the browser CORS rules.
 *
 *   node scripts/build-mobile.mjs
 */

import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'mobile', 'www');

const SHIM = `<script>
/* Capacitor bridge shim - mirrors the Electron preload surface. */
(function () {
  if (window.api) return;                 // already bridged (Electron)
  var allowed = /^https:\\/\\/query[12]\\.finance\\.yahoo\\.com\\//;
  var native = function () {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
  };
  var noop = function () {};
  window.api = {
    get: function (url) {
      if (!allowed.test(url)) return Promise.reject(new Error('blocked'));
      var plugin = native();
      if (!plugin) return fetch(url).then(function (r) { return r.json(); });
      return plugin.get({ url: url, readTimeout: 15000, connectTimeout: 15000 })
        .then(function (response) { return response.data; });
    },
    open: function (url) {
      if (typeof url === 'string' && /^https:\\/\\//.test(url)) window.open(url, '_system');
    },
    /* desktop only */
    win: noop,
    pinWidget: function () { return Promise.resolve(null); },
    updateWidget: noop,
    closeWidget: noop,
    onWidgetData: noop,
    island: noop,
    islandUpdate: noop,
    onIslandData: noop,
    islandIgnore: noop,
    islandRestore: noop,
    onIslandBye: noop,
    onState: noop,
    islandInteractive: function () { return Promise.resolve(false); },
    islandMove: noop,
    islandPin: function () { return Promise.resolve(false); },
    islandPosition: noop,
    islandState: function () { return Promise.resolve({ pinned: true, position: 'top-center' }); },
    islandMenu: noop,
    islandClose: noop,
    islandToggleFront: noop,
    onIslandState: noop,
  };
})();
</script>
`;

mkdirSync(out, { recursive: true });

for (const file of ['main.js', 'preload.js', 'island.html', 'widget.html', 'icon.png']) {
  copyFileSync(join(root, file), join(out, file));
}

// index.html with the shim injected ahead of the app script
const html = readFileSync(join(root, 'index.html'), 'utf8');
const anchor = '<script>';
const at = html.indexOf(anchor);
if (at < 0) {
  throw new Error('could not find the app script in index.html');
}
writeFileSync(join(out, 'index.html'), html.slice(0, at) + SHIM + html.slice(at));

console.log(`built ${out}`);

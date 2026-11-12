'use strict';

/**
 * postinstall - fetch the Windows executable so `npx glassticker` works
 * straight after install. Never fails the install: an offline machine still
 * gets a usable package, and the launcher retries the download later.
 */

const { ensureInstalled } = require('./lib/installer');

ensureInstalled({ quiet: false })
  .then(() => process.exit(0))
  .catch((error) => {
    console.warn(`[glass-ticker] setup skipped: ${error.message}`);
    console.warn('[glass-ticker] run "glassticker install" later to retry.');
    process.exit(0);
  });

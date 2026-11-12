#!/usr/bin/env node
'use strict';

/**
 * glassticker - launch the Glass Ticker desktop app.
 *
 * Commands:
 *   glassticker            launch the app
 *   glassticker install    download the executable without launching
 *   glassticker path       print the executable location
 *   glassticker --help
 */

const { spawn } = require('child_process');
const { ensureInstalled, executablePath, installDir } = require('../lib/installer');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'install') {
    await ensureInstalled({ quiet: false });
    return;
  }
  if (command === 'path') {
    console.log(executablePath());
    return;
  }
  if (command === '--version' || command === '-v') {
    console.log(require('../package.json').version);
    return;
  }
  if (command === '--help' || command === '-h') {
    console.log(
      [
        'glassticker - Glass Ticker desktop market widget',
        '',
        'Usage:',
        '  glassticker            launch the app',
        '  glassticker install    download the Windows executable',
        '  glassticker path       print where the executable lives',
        '  glassticker --version',
        '',
        `Install folder: ${installDir()}`,
      ].join('\n')
    );
    return;
  }

  const target = await ensureInstalled({ quiet: false });
  if (!target) {
    console.error('Glass Ticker only runs on Windows.');
    process.exitCode = 1;
    return;
  }

  const child = spawn(target, args.slice(1), { detached: true, stdio: 'ignore' });
  child.unref();
}

main().catch((error) => {
  console.error(`[glass-ticker] ${error.message}`);
  process.exitCode = 1;
});

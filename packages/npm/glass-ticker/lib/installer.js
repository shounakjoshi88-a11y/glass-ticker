'use strict';

/**
 * Shared installer logic for the npm package.
 *
 * The Windows executable is not shipped inside the npm tarball - it is
 * downloaded from the GitHub release and verified against the hash published
 * in release.json next to it.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const REPO = 'shounakjoshi88-a11y/glass-ticker';
const RELEASE_BASE = `https://github.com/${REPO}/releases/latest/download`;
const MANIFEST_URL = `${RELEASE_BASE}/release.json`;
const USER_AGENT = 'glass-ticker-npm';

function installDir() {
  if (process.env.GLASS_TICKER_HOME) return process.env.GLASS_TICKER_HOME;
  const base = process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'GlassTicker');
}

function executablePath() {
  return path.join(installDir(), 'GlassTicker.exe');
}

async function fetchManifest() {
  const response = await fetch(MANIFEST_URL, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`release manifest unavailable (HTTP ${response.status})`);
  }
  return response.json();
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function isInstalled(manifest) {
  const target = executablePath();
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (manifest && manifest.size && stat.size !== manifest.size) return false;
  if (manifest && manifest.sha256) {
    const digest = await sha256(target);
    return digest === manifest.sha256.toLowerCase();
  }
  return true;
}

async function download(url, target, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(`download failed (HTTP ${response.status})`);
      }
      const temp = `${target}.download`;
      await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temp));
      fs.renameSync(temp, target);
      return target;
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * Ensure the executable is present and verified.
 * Returns the executable path, or null when the host is not Windows.
 */
async function ensureInstalled(options = {}) {
  if (process.platform !== 'win32') {
    if (!options.quiet) {
      console.log(
        '[glass-ticker] Windows only - skipping download on ' + process.platform
      );
    }
    return null;
  }

  fs.mkdirSync(installDir(), { recursive: true });

  let manifest = null;
  try {
    manifest = await fetchManifest();
  } catch (error) {
    if (!options.quiet) console.warn(`[glass-ticker] ${error.message}`);
  }

  if (await isInstalled(manifest)) {
    if (!options.quiet) console.log(`[glass-ticker] ready at ${executablePath()}`);
    return executablePath();
  }

  const url = (manifest && manifest.url) || `${RELEASE_BASE}/GlassTicker.exe`;
  if (!options.quiet) console.log('[glass-ticker] downloading Glass Ticker...');
  const temp = path.join(installDir(), 'GlassTicker.exe.download');
  await download(url, temp);

  if (manifest && manifest.sha256) {
    const digest = await sha256(temp);
    if (digest !== manifest.sha256.toLowerCase()) {
      fs.unlinkSync(temp);
      throw new Error('checksum mismatch - download rejected');
    }
  }
  fs.renameSync(temp, executablePath());
  if (!options.quiet) console.log(`[glass-ticker] installed to ${executablePath()}`);
  return executablePath();
}

module.exports = {
  REPO,
  MANIFEST_URL,
  installDir,
  executablePath,
  fetchManifest,
  ensureInstalled,
  sha256,
};

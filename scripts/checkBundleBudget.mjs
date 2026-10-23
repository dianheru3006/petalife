import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = resolve('dist');
const assets = resolve(dist, 'assets');
const files = readdirSync(assets);
const gzipBytes = path => gzipSync(readFileSync(path)).byteLength;
const entry = files.find(file => /^index-.*\.js$/.test(file));
const css = files.find(file => /^index-.*\.css$/.test(file));
const sw = readFileSync(resolve(dist, 'sw.js'), 'utf8');
const match = sw.match(/const BUILD_ASSETS = (\[[^;]+\]);/);

if (!entry || !css || !match) {
  throw new Error('Cannot verify bundle budget: entry, CSS, or Service Worker manifest is missing.');
}

const precache = JSON.parse(match[1]);
const resolveAsset = file => resolve(dist, file.replace(/^\.\//, ''));
const totalPrecacheGzip = precache.reduce((total, file) => total + gzipBytes(resolveAsset(file)), 0);
const budgets = [
  ['Home entry JS', gzipBytes(resolve(assets, entry)), 80_000],
  ['Shared CSS', gzipBytes(resolve(assets, css)), 25_000],
  ['Offline precache', totalPrecacheGzip, 550_000],
];

for (const [name, actual, limit] of budgets) {
  console.log(`[bundle budget] ${name}: ${actual} / ${limit} gzip bytes`);
  if (actual > limit) process.exitCode = 1;
}

// Ensure old JPEG fallbacks stay available for WebViews without WebP, while
// never forcing them into every offline install on modern devices.
const legacyFallbacks = files.filter(file => /\.(?:jpg|jpeg)$/.test(file));
if (legacyFallbacks.some(file => precache.some(asset => asset.endsWith(file)))) {
  throw new Error('Legacy JPEG fallback entered the Service Worker precache.');
}

const rawPrecacheBytes = precache.reduce((total, file) => total + statSync(resolveAsset(file)).size, 0);
console.log(`[bundle budget] ${precache.length} precached files, ${rawPrecacheBytes} raw bytes`);

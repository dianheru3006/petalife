import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * AUDIT-FIX (P1): the shell was already Google-Fonts-free, but `public/sw.js`
 * still special-cased `googleapis.com`/`gstatic.com` in its same-origin branch.
 * That whitelist is dead code today and a regression magnet tomorrow: any future
 * `<link>` to a third-party font would be silently cached forever on the phone.
 * The policy is now a test, not a comment.
 */

const rootUrl = new URL('../../../', import.meta.url);
const readText = (relativePath: string) => readFileSync(new URL(relativePath, rootUrl), 'utf-8');

describe('Zero third-party requests (low-end WebView budget)', () => {
  const sw = readText('public/sw.js');
  const indexHtml = readText('index.html');

  it('never caches Google Fonts in the Service Worker', () => {
    expect(sw).not.toContain('googleapis.com');
    expect(sw).not.toContain('gstatic.com');
    expect(sw).not.toContain('fonts.googleapis');
  });

  it('keeps the shell free of external stylesheets and fonts', () => {
    expect(indexHtml).not.toContain('fonts.googleapis');
    expect(indexHtml).not.toContain('gstatic');
    expect(indexHtml).not.toMatch(/<link\b[^>]*href="https?:\/\//);
  });

  it('loads exactly one external script, the Telegram Mini App SDK', () => {
    const scripts = [...indexHtml.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
    const external = scripts.filter(src => /^https?:\/\//.test(src));

    expect(external).toHaveLength(1);
    expect(new URL(external[0]).hostname).toBe('telegram.org');
  });
});

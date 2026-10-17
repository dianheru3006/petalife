/**
 * URL Normalization Policy for Petalife Content Vault:
 *
 * 1. Protocol & Host:
 *    - Defaults to 'https://'.
 *    - Hostnames are lowercased and leading 'www.' is stripped.
 *
 * 2. Query Parameters:
 *    - Strips marketing/click-tracking noise:
 *      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
 *      'fbclid', 'gclid', 'igshid', 'si', 'ref', 'ref_src', 'feature'.
 *    - PRESERVES content-defining query parameters:
 *      e.g. YouTube video identifier ('v'), timestamp ('t'), playlist ('list'),
 *      or generic content selectors ('id', 'p', 'article').
 *    - Sorts remaining parameters alphabetically so order differences do not bypass deduplication.
 *
 * 3. Path & Hash:
 *    - Strips trailing slash on pathnames (e.g. '/shorts/abc/' -> '/shorts/abc').
 *    - Drops transient URL hash/anchors (#...).
 */

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'igshid',
  'si',
  'ref',
  'ref_src',
  'feature',
]);

/**
 * Normalizes a URL string for deterministic duplicate detection.
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';

  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Ensure protocol is present for URL parser
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);

    // Normalize protocol and host
    const protocol = 'https:';
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }

    // Normalize pathname: remove duplicate slashes and trailing slash (except root)
    let pathname = parsed.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Filter and sort query parameters
    const cleanedParams = new URLSearchParams();
    const sortedKeys = Array.from(parsed.searchParams.keys()).sort();

    for (const key of sortedKeys) {
      if (!TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        const values = parsed.searchParams.getAll(key);
        for (const val of values) {
          cleanedParams.append(key, val);
        }
      }
    }

    const searchString = cleanedParams.toString();
    const searchPart = searchString ? `?${searchString}` : '';

    return `${protocol}//${host}${pathname}${searchPart}`;
  } catch {
    // If URL parsing fails, fallback to basic sanitization
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Validates whether a string resembles a valid URL.
 */
export function isValidUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

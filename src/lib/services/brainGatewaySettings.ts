const STORAGE_KEY = 'petalife.brainGatewayUrl.v1';
export const DEFAULT_BRAIN_GATEWAY_URL = 'https://7474911c071a9d.lhr.life';

export function normalizeBrainGatewayUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function getBrainGatewayUrl(): string {
  try {
    return normalizeBrainGatewayUrl(localStorage.getItem(STORAGE_KEY) || '') || '';
  } catch {
    return '';
  }
}

export function saveBrainGatewayUrl(input: string): boolean {
  const normalized = normalizeBrainGatewayUrl(input);
  if (normalized === null) return false;
  try {
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

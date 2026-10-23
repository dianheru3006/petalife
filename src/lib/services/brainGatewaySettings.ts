const STORAGE_KEY = 'petalife.brainGatewayUrl.v1';
const LAST_SYNTH_KEY = 'petalife.brainLastSynthesis.v1';
export const DEFAULT_BRAIN_GATEWAY_URL = 'https://brain.tomogotchi.web.id';

export type GatewayUrlSource = 'localStorage' | 'environment' | 'default' | 'none';

export interface EffectiveGatewayUrl {
  url: string;
  source: GatewayUrlSource;
}

export interface LastSuccessfulSynthesis {
  timestamp: number;
  title: string;
  category?: string;
  durationMs?: number;
}

export interface GatewayDiagnostic {
  reachable: boolean;
  latencyMs: number;
  status: number;
  statusText: string;
  effectiveUrl: string;
  source: GatewayUrlSource;
  hasLLM?: boolean;
  version?: string;
  authenticated: boolean;
  errorMessage?: string;
}

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

export function getEffectiveGatewayUrl(): EffectiveGatewayUrl {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      if (stored === '') {
        return { url: '', source: 'none' };
      }
      const normalizedStored = normalizeBrainGatewayUrl(stored);
      if (normalizedStored) {
        return { url: normalizedStored, source: 'localStorage' };
      }
    }
  } catch {
    // Ignore storage read error
  }

  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOT_API_URL) as string | undefined;
  if (envUrl) {
    const normalizedEnv = normalizeBrainGatewayUrl(envUrl);
    if (normalizedEnv) {
      return { url: normalizedEnv, source: 'environment' };
    }
  }

  if (DEFAULT_BRAIN_GATEWAY_URL) {
    return { url: DEFAULT_BRAIN_GATEWAY_URL, source: 'default' };
  }

  return { url: '', source: 'none' };
}

export function getBrainGatewayUrl(): string {
  return getEffectiveGatewayUrl().url;
}

export function saveBrainGatewayUrl(input: string): boolean {
  const normalized = normalizeBrainGatewayUrl(input);
  if (normalized === null) return false;
  try {
    if (normalized) localStorage.setItem(STORAGE_KEY, normalized);
    else localStorage.setItem(STORAGE_KEY, '');
    return true;
  } catch {
    return false;
  }
}

export function clearStoredBrainGatewayUrl(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function saveLastSuccessfulSynthesis(data: Omit<LastSuccessfulSynthesis, 'timestamp'>): void {
  try {
    localStorage.setItem(LAST_SYNTH_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch {}
}

export function getLastSuccessfulSynthesis(): LastSuccessfulSynthesis | null {
  try {
    const raw = localStorage.getItem(LAST_SYNTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function testGatewayConnection(targetUrl?: string, timeoutMs: number = 3000): Promise<GatewayDiagnostic> {
  const effective = targetUrl !== undefined
    ? { url: normalizeBrainGatewayUrl(targetUrl) || '', source: 'localStorage' as GatewayUrlSource }
    : getEffectiveGatewayUrl();

  const initData = typeof window !== 'undefined'
    ? (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || ''
    : '';

  if (!effective.url) {
    return {
      reachable: false,
      latencyMs: 0,
      status: 0,
      statusText: 'URL belum dikonfigurasi',
      effectiveUrl: '',
      source: effective.source,
      authenticated: Boolean(initData),
      errorMessage: 'Alamat Brain Gateway belum diisi.'
    };
  }

  const healthEndpoint = `${effective.url.replace(/\/$/, '')}/api/petalife/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = performance.now();

  try {
    const res = await fetch(healthEndpoint, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    const latencyMs = Math.round(performance.now() - startTime);
    clearTimeout(timer);

    if (res.ok) {
      let json: any = {};
      try { json = await res.json(); } catch {}
      return {
        reachable: true,
        latencyMs,
        status: res.status,
        statusText: 'Terhubung',
        effectiveUrl: effective.url,
        source: effective.source,
        hasLLM: Boolean(json.hasLLM),
        version: json.version || '2.0.0',
        authenticated: Boolean(initData),
      };
    }

    return {
      reachable: false,
      latencyMs,
      status: res.status,
      statusText: `HTTP ${res.status}`,
      effectiveUrl: effective.url,
      source: effective.source,
      authenticated: Boolean(initData),
      errorMessage: `Server merespons status ${res.status}.`
    };
  } catch (err: any) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - startTime);
    const isTimeout = err?.name === 'AbortError' || latencyMs >= timeoutMs;
    return {
      reachable: false,
      latencyMs,
      status: 0,
      statusText: isTimeout ? 'Timeout' : 'Gagal menghubungi',
      effectiveUrl: effective.url,
      source: effective.source,
      authenticated: Boolean(initData),
      errorMessage: isTimeout
        ? 'Waktu koneksi habis (server tidak merespons dalam 3 detik).'
        : 'Browser belum dapat menghubungi gateway (periksa URL, jaringan, atau DNS).'
    };
  }
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { synthesizeLink } from './aiSynthesisService';

describe('aiSynthesisService', () => {
  const originalFetch = globalThis.fetch;
  const storageMap = new Map<string, string>();

  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, value: string) => { storageMap.set(key, value); },
      removeItem: (key: string) => { storageMap.delete(key); },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('handles network error (failed to fetch) with honest gateway_error and network_error type', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('network_error');
    expect(result.isFromRemoteAI).toBe(false);
    expect(result.content.notes).toContain('Browser belum dapat menghubungi Brain Gateway.');
  });

  it('handles 401 Unauthorized with honest session requirement message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Unauthorized: Telegram authentication required' }),
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('unauthorized');
    expect(result.gatewayHttpStatus).toBe(401);
    expect(result.content.notes).toContain('Sesi AI belum valid.');
  });

  it('handles 429 Rate Limit with rate_limited error type', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: new Headers({ 'content-type': 'application/json', 'retry-after': '60' }),
      json: async () => ({ error: 'Rate limit exceeded' }),
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('gateway_error');
    expect(result.gatewayErrorType).toBe('rate_limited');
    expect(result.gatewayHttpStatus).toBe(429);
    expect(result.content.notes).toContain('Mochi sedang sibuk.');
  });

  it('handles successful 200 response with grounded 4-layer synthesis', async () => {
    const mockPayload = {
      success: true,
      data: {
        title: 'Bagaimana Uang Diciptakan?',
        category: 'Finansial',
        tags: ['#uang', '#finansial', '#bank'],
        coreThesis: 'Uang diciptakan melalui utang sistem perbankan komersial.',
        keyTakeaways: [
          { concept: 'Uang Giral', explanation: 'Sebagian besar uang tercipta saat bank menyalurkan kredit.' },
        ],
        actionableInsights: ['Pahami inflasi dan diversifikasi aset riil.'],
        reflectionPrompt: 'Bagaimana Anda memanfaatkan utang produktif?',
        author: 'Ngomongin Uang',
        notes: 'Catatan 4 lapis lengkap...',
        summary: 'Ringkasan komprehensif...',
        qualityStatus: 'grounded',
        evidenceLevel: 'full_text',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const result = await synthesizeLink('https://youtu.be/dummy123', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('grounded');
    expect(result.isFromRemoteAI).toBe(true);
    expect(result.content.title).toBe('Bagaimana Uang Diciptakan?');
    expect(result.content.coreThesis).toBe('Uang diciptakan melalui utang sistem perbankan komersial.');
    expect(result.content.tags).toEqual(['#uang', '#finansial', '#bank']);
  });

  it('handles 200 response with genuine needs_context without fabricating fake notes', async () => {
    const mockPayload = {
      success: true,
      data: {
        title: 'Video Tanpa Subtitle',
        category: 'Umum',
        tags: ['#video'],
        qualityStatus: 'needs_context',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayload,
    });

    const result = await synthesizeLink('https://youtu.be/nosubs', 'youtube', 'youtube.com');

    expect(result.qualityStatus).toBe('needs_context');
    expect(result.isFromRemoteAI).toBe(true);
  });
});

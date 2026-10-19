import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBrainGatewayUrl, normalizeBrainGatewayUrl, saveBrainGatewayUrl, DEFAULT_BRAIN_GATEWAY_URL } from './brainGatewaySettings';

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
});

describe('Brain Gateway URL setting', () => {
  it('has a valid HTTPS default gateway URL', () => {
    expect(DEFAULT_BRAIN_GATEWAY_URL).toMatch(/^https:\/\/[a-z0-9.-]+$/);
    expect(normalizeBrainGatewayUrl(DEFAULT_BRAIN_GATEWAY_URL)).toBe(DEFAULT_BRAIN_GATEWAY_URL);
  });

  it('saves a normalized HTTPS origin and allows clearing it', () => {
    expect(saveBrainGatewayUrl('  https://brain.example.com/  ')).toBe(true);
    expect(getBrainGatewayUrl()).toBe('https://brain.example.com');
    expect(saveBrainGatewayUrl('')).toBe(true);
    expect(getBrainGatewayUrl()).toBe('');
  });

  it('rejects HTTP, embedded credentials, paths, and query tokens', () => {
    expect(normalizeBrainGatewayUrl('http://brain.example.com')).toBeNull();
    expect(normalizeBrainGatewayUrl('https://user:pass@brain.example.com')).toBeNull();
    expect(normalizeBrainGatewayUrl('https://brain.example.com/api/petalife/summarize-link')).toBeNull();
    expect(normalizeBrainGatewayUrl('https://brain.example.com/?token=secret')).toBeNull();
  });
});

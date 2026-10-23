import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getRoomWeather } from './weatherService';

class TestStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  key(index: number): string | null { return [...this.store.keys()][index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

describe('weatherService', () => {
  let mockStorage: TestStorage;

  beforeEach(() => {
    mockStorage = new TestStorage();
    vi.restoreAllMocks();
  });

  it('returns fallback data gracefully if fetch fails or throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

    const weather = await getRoomWeather(mockStorage as unknown as Storage);
    expect(weather).toBeDefined();
    expect(weather.temperature).toBeGreaterThan(0);
    expect(typeof weather.isRaining).toBe('boolean');
  });

  it('correctly maps rainy WMO code (e.g. 61) to rainy weatherType', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        current_weather: {
          weathercode: 61,
          temperature: 24.5,
        },
      }),
    } as unknown as Response);

    const weather = await getRoomWeather(mockStorage as unknown as Storage);
    expect(weather.isRaining).toBe(true);
    expect(weather.weatherType).toBe('rainy');
    expect(weather.temperature).toBe(25);
  });

  it('correctly maps clear weather code 0 to sunny and caches result', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        current_weather: {
          weathercode: 0,
          temperature: 30.2,
        },
      }),
    } as unknown as Response);

    const weather = await getRoomWeather(mockStorage as unknown as Storage);
    expect(weather.isRaining).toBe(false);
    expect(weather.weatherType).toBe('sunny');
    expect(weather.temperature).toBe(30);

    // Verify cache in storage
    const cached = mockStorage.getItem('petalife_diegetic_weather_v1');
    expect(cached).toBeTruthy();

    // Reset spy call count
    fetchSpy.mockClear();

    // Calling again returns cached data without another fetch call
    const cachedWeather = await getRoomWeather(mockStorage as unknown as Storage);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cachedWeather.weatherType).toBe('sunny');
  });
});

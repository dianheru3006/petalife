/**
 * Weather Service for Diegetic Petalife Living Room
 * Connects to Open-Meteo API (Free, zero API key required).
 * Caches in sessionStorage for 30 minutes.
 * 100% resilient: falls back gracefully without throwing if offline.
 */

export interface RoomWeatherData {
  isRaining: boolean;
  weatherType: 'sunny' | 'rainy' | 'cloudy' | 'cozy';
  temperature: number;
  conditionDescription: string;
}

const WEATHER_STORAGE_KEY = 'petalife_diegetic_weather_v1';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function getRoomWeather(customStorage?: Storage): Promise<RoomWeatherData> {
  const fallbackWeather: RoomWeatherData = {
    isRaining: false,
    weatherType: 'cozy',
    temperature: 27,
    conditionDescription: 'Cerah Berawan',
  };

  const storage = customStorage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

  // 1. Check cached weather in storage
  if (storage) {
    try {
      const raw = storage.getItem(WEATHER_STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS && cached.data) {
          return cached.data;
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }

  // 2. Fetch from Open-Meteo with 3.5s strict timeout
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current_weather=true',
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const code = Number(data.current_weather?.weathercode ?? 0);
    const temp = Math.round(Number(data.current_weather?.temperature ?? 27));

    // Open-Meteo WMO Weather codes:
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 80, 81, 82: Rain showers
    // 95, 96, 99: Thunderstorm
    const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
    const isCloudy = [1, 2, 3, 45, 48].includes(code);

    let weatherType: RoomWeatherData['weatherType'] = 'sunny';
    let conditionDescription = 'Cerah Hangat';

    if (isRaining) {
      weatherType = 'rainy';
      conditionDescription = 'Rintik Hujan Sejuk';
    } else if (isCloudy) {
      weatherType = 'cloudy';
      conditionDescription = 'Sejuk Teduh';
    }

    const result: RoomWeatherData = {
      isRaining,
      weatherType,
      temperature: temp,
      conditionDescription,
    };

    if (storage) {
      try {
        storage.setItem(
          WEATHER_STORAGE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: result })
        );
      } catch {}
    }

    return result;
  } catch {
    // Offline or network failover
    return fallbackWeather;
  }
}

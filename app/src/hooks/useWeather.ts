import { useState, useEffect } from 'react';

export interface DailyWeather {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export interface WeatherData {
  daily: DailyWeather[];
  loading: boolean;
  error: string | null;
  hasFrostWarning: boolean;
  lastFetched: string | null;
}

const CACHE_KEY = 'gardenDesigner_weather';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CachedWeather {
  data: DailyWeather[];
  fetchedAt: number;
}

function getCachedWeather(): CachedWeather | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const parsed: CachedWeather = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt < CACHE_DURATION_MS) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCachedWeather(data: DailyWeather[]) {
  try {
    const cached: CachedWeather = { data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // ignore
  }
}

export function useWeather(latitude = 44.98, longitude = -93.27): WeatherData {
  const [daily, setDaily] = useState<DailyWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      // Check cache first
      const cached = getCachedWeather();
      if (cached) {
        setDaily(cached.data);
        setLastFetched(new Date(cached.fetchedAt).toLocaleTimeString());
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=America/Chicago&forecast_days=7&temperature_unit=fahrenheit`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();

        if (cancelled) return;

        const days: DailyWeather[] = json.daily.time.map((date: string, i: number) => ({
          date,
          tempMax: Math.round(json.daily.temperature_2m_max[i]),
          tempMin: Math.round(json.daily.temperature_2m_min[i]),
          precipitation: json.daily.precipitation_sum[i],
        }));

        setDaily(days);
        setCachedWeather(days);
        setLastFetched(new Date().toLocaleTimeString());
      } catch (err) {
        if (!cancelled) {
          setError('Weather data unavailable');
          // Try to use stale cache
          try {
            const stale = localStorage.getItem(CACHE_KEY);
            if (stale) {
              const parsed: CachedWeather = JSON.parse(stale);
              setDaily(parsed.data);
              setLastFetched('cached');
            }
          } catch {
            // ignore
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  const hasFrostWarning = daily.some(d => d.tempMin <= 32);

  return { daily, loading, error, hasFrostWarning, lastFetched };
}

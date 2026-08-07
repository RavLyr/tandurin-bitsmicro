import { Type, type FunctionDeclaration } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Weather tool (F-03, T-201 step 1). Cache-first (30 min TTL) OpenWeatherMap
 * current weather + 5-day forecast. Returns null on any failure so the agent
 * degrades gracefully (F-03 §7: proceed + note "data cuaca tidak tersedia").
 */

export const weather_declaration: FunctionDeclaration = {
  name: "weather_lookup",
  description:
    "Cek kondisi cuaca saat ini dan prakiraan 5 hari untuk koordinat lahan. Dipakai saat pengguna bertanya tentang jadwal tanam, penyiraman, atau perlindungan tanaman dari hujan/panas.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: {
        type: Type.NUMBER,
        description: "Garis lintang lahan dalam derajat desimal.",
      },
      longitude: {
        type: Type.NUMBER,
        description: "Garis bujur lahan dalam derajat desimal.",
      },
    },
    required: ["latitude", "longitude"],
  },
};

export interface WeatherResult {
  temp_c: number;
  humidity: number;
  description: string;
  forecast_5d: {
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    description: string;
  }[];
}

const CACHE_TTL_MINUTES = 30;

interface OpenWeatherCurrent {
  main: { temp: number; humidity: number };
  weather: { description: string }[];
}
interface OpenWeatherForecast {
  list: {
    dt_txt: string;
    main: { temp_max: number; temp_min: number };
    weather: { description: string }[];
  }[];
}

export async function weather_executor(
  args: { latitude: number; longitude: number },
  supabase: SupabaseClient
): Promise<WeatherResult | null> {
  const { latitude, longitude } = args;

  try {
    // (a) cache hit: fetched within the last 30 minutes
    const { data: cached } = await supabase
      .from("weather_cache")
      .select("payload")
      .eq("lat", latitude)
      .eq("lon", longitude)
      .gt("fetched_at", new Date(Date.now() - CACHE_TTL_MINUTES * 60_000).toISOString())
      .maybeSingle();

    if (cached?.payload) {
      return cached.payload as WeatherResult;
    }

    // (b) fetch current + 5-day forecast
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=id&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&lang=id&appid=${apiKey}`
      ),
    ]);

    if (!currentRes.ok || !forecastRes.ok) return null;

    const [current, forecast] = (await Promise.all([
      currentRes.json(),
      forecastRes.json(),
    ])) as [OpenWeatherCurrent, OpenWeatherForecast];

    const result: WeatherResult = {
      temp_c: current.main.temp,
      humidity: current.main.humidity,
      description: current.weather[0]?.description ?? "",
      forecast_5d: aggregateDailyForecast(forecast),
    };

    // (c) upsert cache
    await supabase
      .from("weather_cache")
      .upsert(
        {
          lat: latitude,
          lon: longitude,
          payload: result,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "lat,lon" }
      );

    return result;
  } catch {
    // (e) any fetch/parse failure → null (agent proceeds without weather)
    return null;
  }
}

/** Collapse 3-hourly forecast list into one entry per UTC day. */
function aggregateDailyForecast(forecast: OpenWeatherForecast): WeatherResult["forecast_5d"] {
  const byDay = new Map<string, { max: number; min: number; desc: string }>();

  for (const entry of forecast.list) {
    const date = entry.dt_txt.slice(0, 10);
    const current = byDay.get(date);
    if (!current) {
      byDay.set(date, {
        max: entry.main.temp_max,
        min: entry.main.temp_min,
        desc: entry.weather[0]?.description ?? "",
      });
    } else {
      current.max = Math.max(current.max, entry.main.temp_max);
      current.min = Math.min(current.min, entry.main.temp_min);
    }
  }

  return [...byDay.entries()].slice(0, 5).map(([date, { max, min, desc }]) => ({
    date,
    temp_max_c: max,
    temp_min_c: min,
    description: desc,
  }));
}

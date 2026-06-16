import {
  ProviderError,
  type GeocodeResult,
  type WeatherSnapshot,
} from "@/lib/types";

const REVALIDATE_SECONDS = 600;

type FetchInit = RequestInit & { next?: { revalidate?: number } };

async function fetchJson<T>(url: string): Promise<T> {
  const init: FetchInit = { next: { revalidate: REVALIDATE_SECONDS } };
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (cause) {
    throw new ProviderError(
      `Network error contacting provider: ${String(cause)}`,
      502,
    );
  }
  if (!res.ok) {
    throw new ProviderError(
      `Provider responded with HTTP ${res.status}`,
      502,
    );
  }
  return (await res.json()) as T;
}

type GeoApiResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }>;
};

export async function geocode(q: string): Promise<GeocodeResult[]> {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=8&language=en&format=json`;
  const data = await fetchJson<GeoApiResponse>(url);
  if (!data.results) {
    return [];
  }
  return data.results.map((r) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }));
}

type ForecastApiResponse = {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: Array<number | null>;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: Array<number | null>;
  };
};

type AirQualityApiResponse = {
  current?: {
    us_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
  };
};

export function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function trimHourly(
  forecast: ForecastApiResponse,
  now: number,
): WeatherSnapshot["hourly"] {
  const times = forecast.hourly.time;
  let startIndex = times.findIndex((t) => new Date(t).getTime() >= now);
  if (startIndex < 0) {
    startIndex = 0;
  }
  const end = Math.min(startIndex + 24, times.length);
  const out: WeatherSnapshot["hourly"] = [];
  for (let i = startIndex; i < end; i += 1) {
    out.push({
      time: times[i],
      temperature: forecast.hourly.temperature_2m[i],
      weatherCode: forecast.hourly.weather_code[i],
      precipProbability: forecast.hourly.precipitation_probability[i] ?? 0,
    });
  }
  return out;
}

async function fetchAirQuality(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot["airQuality"]> {
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}` +
      `&longitude=${lon}&current=us_aqi,pm2_5,pm10`;
    const data = await fetchJson<AirQualityApiResponse>(url);
    const aqi = data.current?.us_aqi;
    if (aqi === undefined || aqi === null) {
      return null;
    }
    return {
      aqi,
      category: aqiCategory(aqi),
      pm25: data.current?.pm2_5 ?? undefined,
      pm10: data.current?.pm10 ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getWeather(
  lat: number,
  lon: number,
  name?: string,
): Promise<WeatherSnapshot> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m,wind_direction_10m` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max` +
    `&forecast_days=7&timezone=auto&wind_speed_unit=kmh&temperature_unit=celsius`;

  const forecast = await fetchJson<ForecastApiResponse>(forecastUrl);
  const airQuality = await fetchAirQuality(lat, lon);

  const now = Date.now();

  const daily: WeatherSnapshot["daily"] = forecast.daily.time.map((date, i) => ({
    date,
    tempMin: forecast.daily.temperature_2m_min[i],
    tempMax: forecast.daily.temperature_2m_max[i],
    weatherCode: forecast.daily.weather_code[i],
    sunrise: forecast.daily.sunrise[i],
    sunset: forecast.daily.sunset[i],
    uvIndexMax: forecast.daily.uv_index_max[i] ?? 0,
  }));

  return {
    location: {
      name: name ?? `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat,
      longitude: lon,
      timezone: forecast.timezone,
    },
    current: {
      temperature: forecast.current.temperature_2m,
      apparentTemperature: forecast.current.apparent_temperature,
      weatherCode: forecast.current.weather_code,
      humidity: forecast.current.relative_humidity_2m,
      windSpeed: forecast.current.wind_speed_10m,
      windDirection: forecast.current.wind_direction_10m,
      isDay: forecast.current.is_day === 1,
      observedAt: forecast.current.time,
    },
    hourly: trimHourly(forecast, now),
    daily,
    airQuality,
    fetchedAt: new Date().toISOString(),
  };
}

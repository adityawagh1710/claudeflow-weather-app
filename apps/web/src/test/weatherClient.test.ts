import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getWeather, geocode, aqiCategory } from "@/lib/weatherClient";

// Fixed clock so hourly trimming is deterministic (no Date.now() race).
const FIXED_NOW = new Date("2024-06-01T12:00:00.000Z").getTime();

function buildForecast() {
  // 48 hourly entries starting "now" so trimming to 24 is exercised.
  const base = FIXED_NOW;
  const time: string[] = [];
  const temperature_2m: number[] = [];
  const weather_code: number[] = [];
  const precipitation_probability: Array<number | null> = [];
  for (let i = 0; i < 48; i += 1) {
    time.push(new Date(base + i * 3600_000).toISOString());
    temperature_2m.push(10 + i);
    weather_code.push(i % 2 === 0 ? 0 : 61);
    precipitation_probability.push(i === 0 ? null : i);
  }
  return {
    timezone: "Europe/London",
    current: {
      time: "2024-06-01T12:00:00",
      temperature_2m: 18,
      apparent_temperature: 17,
      relative_humidity_2m: 55,
      is_day: 1,
      weather_code: 3,
      wind_speed_10m: 12,
      wind_direction_10m: 270,
    },
    hourly: { time, temperature_2m, weather_code, precipitation_probability },
    daily: {
      time: ["2024-06-01", "2024-06-02"],
      weather_code: [0, 61],
      temperature_2m_max: [22, 19],
      temperature_2m_min: [12, 11],
      sunrise: ["2024-06-01T05:00", "2024-06-02T05:01"],
      sunset: ["2024-06-01T21:00", "2024-06-02T21:01"],
      uv_index_max: [6, null],
    },
  };
}

const FETCH = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  vi.stubGlobal("fetch", FETCH);
  FETCH.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe("aqiCategory", () => {
  it("maps ranges to categories", () => {
    expect(aqiCategory(20)).toBe("Good");
    expect(aqiCategory(75)).toBe("Moderate");
    expect(aqiCategory(120)).toBe("Unhealthy for Sensitive");
    expect(aqiCategory(180)).toBe("Unhealthy");
    expect(aqiCategory(250)).toBe("Very Unhealthy");
    expect(aqiCategory(400)).toBe("Hazardous");
  });
});

describe("geocode", () => {
  it("normalizes results", async () => {
    FETCH.mockResolvedValueOnce(
      jsonResponse({
        results: [
          {
            name: "Paris",
            latitude: 48.85,
            longitude: 2.35,
            country: "France",
            admin1: "Île-de-France",
          },
        ],
      }),
    );
    const out = await geocode("paris");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: "Paris",
      latitude: 48.85,
      longitude: 2.35,
      country: "France",
    });
  });

  it("returns empty array when no results", async () => {
    FETCH.mockResolvedValueOnce(jsonResponse({}));
    expect(await geocode("xyz")).toEqual([]);
  });

  it("throws ProviderError on HTTP failure", async () => {
    FETCH.mockResolvedValueOnce(jsonResponse({}, false, 500));
    await expect(geocode("paris")).rejects.toThrow(/HTTP 500/);
  });
});

describe("getWeather", () => {
  it("normalizes to WeatherSnapshot, trims hourly to 24, maps AQI", async () => {
    FETCH.mockResolvedValueOnce(jsonResponse(buildForecast())) // forecast
      .mockResolvedValueOnce(
        jsonResponse({ current: { us_aqi: 42, pm2_5: 5.5, pm10: 8.2 } }),
      ); // air quality

    const snap = await getWeather(51.5, -0.12, "London");

    expect(snap.location.name).toBe("London");
    expect(snap.location.timezone).toBe("Europe/London");
    expect(snap.current.temperature).toBe(18);
    expect(snap.current.weatherCode).toBe(3);
    expect(snap.current.isDay).toBe(true);
    expect(snap.hourly).toHaveLength(24);
    expect(snap.hourly[0].precipProbability).toBe(0); // null coerced
    expect(snap.daily).toHaveLength(2);
    expect(snap.daily[1].uvIndexMax).toBe(0); // null coerced
    expect(snap.airQuality).toMatchObject({
      aqi: 42,
      category: "Good",
      pm25: 5.5,
      pm10: 8.2,
    });
  });

  it("sets airQuality=null when air-quality fetch fails", async () => {
    FETCH.mockResolvedValueOnce(jsonResponse(buildForecast())) // forecast ok
      .mockResolvedValueOnce(jsonResponse({}, false, 503)); // AQI fails

    const snap = await getWeather(51.5, -0.12);
    expect(snap.airQuality).toBeNull();
  });

  it("throws ProviderError when forecast fetch fails", async () => {
    FETCH.mockResolvedValueOnce(jsonResponse({}, false, 500));
    await expect(getWeather(51.5, -0.12)).rejects.toThrow(/HTTP 500/);
  });
});

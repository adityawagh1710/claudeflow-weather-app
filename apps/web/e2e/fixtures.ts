import type { Page } from "@playwright/test";
import type { WeatherSnapshot, GeocodeResult } from "../src/lib/types";

// Deterministic, timezone-stable ISO strings (explicit offset) so that
// 24h vs 12h formatting is predictable regardless of the runner's locale.
const OBSERVED_AT = "2024-06-01T13:05:00+00:00";

export function makeSnapshot(
  name: string,
  latitude: number,
  longitude: number,
  temperatureC: number,
): WeatherSnapshot {
  return {
    location: { name, latitude, longitude, timezone: "UTC" },
    current: {
      temperature: temperatureC,
      apparentTemperature: temperatureC - 1,
      weatherCode: 0,
      humidity: 55,
      windSpeed: 12,
      windDirection: 270,
      isDay: true,
      observedAt: OBSERVED_AT,
    },
    hourly: [
      {
        time: "2024-06-01T14:00:00+00:00",
        temperature: temperatureC + 1,
        weatherCode: 1,
        precipProbability: 10,
      },
      {
        time: "2024-06-01T15:00:00+00:00",
        temperature: temperatureC + 2,
        weatherCode: 2,
        precipProbability: 20,
      },
    ],
    daily: [
      {
        date: "2024-06-01",
        tempMin: temperatureC - 5,
        tempMax: temperatureC + 5,
        weatherCode: 0,
        sunrise: "2024-06-01T05:00:00+00:00",
        sunset: "2024-06-01T21:00:00+00:00",
        uvIndexMax: 6,
      },
    ],
    airQuality: { aqi: 42, category: "Good", pm25: 5.5, pm10: 8.2 },
    fetchedAt: OBSERVED_AT,
  };
}

const LONDON_GEO: GeocodeResult[] = [
  {
    name: "London",
    latitude: 51.5072,
    longitude: -0.1276,
    country: "United Kingdom",
    admin1: "England",
  },
];

const PARIS_GEO: GeocodeResult[] = [
  {
    name: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    country: "France",
    admin1: "Île-de-France",
  },
];

// Intercept all network the app makes so E2E never touches live Open-Meteo.
export async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/iplocation", async (route) => {
    await route.fulfill({
      json: { latitude: 51.5072, longitude: -0.1276, name: "London" },
    });
  });

  await page.route("**/api/geocode**", async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const results = q.includes("paris") ? PARIS_GEO : LONDON_GEO;
    await route.fulfill({ json: { results } });
  });

  await page.route("**/api/weather**", async (route) => {
    const url = new URL(route.request().url());
    const lat = Number(url.searchParams.get("lat"));
    const name = url.searchParams.get("name") ?? "London";
    // Paris is warmer than London in our fixture so values differ per city.
    const isParis = Math.abs(lat - 48.8566) < 0.01;
    const snap = isParis
      ? makeSnapshot(name, 48.8566, 2.3522, 25)
      : makeSnapshot(name, 51.5072, -0.1276, 18);
    await route.fulfill({ json: snap });
  });
}

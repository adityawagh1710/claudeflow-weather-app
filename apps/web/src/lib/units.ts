import type { TempUnit, WindUnit, TimeFormat } from "@/lib/types";

export function toFahrenheit(c: number): number {
  return c * (9 / 5) + 32;
}

export function formatTemp(c: number, unit: TempUnit): string {
  if (unit === "fahrenheit") {
    return `${Math.round(toFahrenheit(c))}°F`;
  }
  return `${Math.round(c)}°C`;
}

export function kmhToMph(k: number): number {
  return k * 0.621371;
}

export function formatWind(kmh: number, unit: WindUnit): string {
  if (unit === "mph") {
    return `${Math.round(kmhToMph(kmh))} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatTime(iso: string, format: TimeFormat): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  if (format === "24h") {
    return `${hours.toString().padStart(2, "0")}:${minutes}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${minutes} ${period}`;
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

const COMPASS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export function degToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS[index];
}

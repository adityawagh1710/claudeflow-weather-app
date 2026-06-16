"use client";

import { useQuery } from "@tanstack/react-query";
import type { WeatherSnapshot } from "@/lib/types";

async function fetchWeather(
  lat: number,
  lon: number,
  name?: string,
): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
  });
  if (name) {
    params.set("name", name);
  }
  const res = await fetch(`/api/weather?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load weather");
  }
  return (await res.json()) as WeatherSnapshot;
}

export function useWeather(
  lat: number | null,
  lon: number | null,
  name?: string,
) {
  return useQuery({
    queryKey: ["weather", lat, lon],
    queryFn: () => fetchWeather(lat as number, lon as number, name),
    enabled: lat !== null && lon !== null,
  });
}

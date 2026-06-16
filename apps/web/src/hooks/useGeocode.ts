"use client";

import { useQuery } from "@tanstack/react-query";
import type { GeocodeResult } from "@/lib/types";

async function fetchGeocode(q: string): Promise<GeocodeResult[]> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to search locations");
  }
  const data = (await res.json()) as { results: GeocodeResult[] };
  return data.results;
}

export function useGeocode(q: string) {
  return useQuery({
    queryKey: ["geocode", q],
    queryFn: () => fetchGeocode(q),
    enabled: q.trim().length >= 2,
  });
}

import { ValidationError } from "@/lib/types";

export function parseLatLon(searchParams: URLSearchParams): {
  lat: number;
  lon: number;
} {
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  if (latRaw === null || lonRaw === null) {
    throw new ValidationError("lat and lon are required");
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ValidationError("lat must be a number in [-90, 90]");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new ValidationError("lon must be a number in [-180, 180]");
  }
  return { lat, lon };
}

export function parseQuery(q: string | null): string {
  if (q === null) {
    throw new ValidationError("q is required");
  }
  const trimmed = q.trim();
  if (trimmed.length < 1) {
    throw new ValidationError("q must not be empty");
  }
  if (trimmed.length > 100) {
    throw new ValidationError("q must be at most 100 characters");
  }
  return trimmed;
}

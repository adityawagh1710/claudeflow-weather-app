// Browser geolocation helper. Resolves to coordinates from the device's
// Geolocation API (with user permission), or null if unavailable/denied/timed out.
// Never rejects — callers fall back to IP-based location.

export interface Coords {
  latitude: number;
  longitude: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 600_000; // accept a cached fix up to 10 min old

export function requestBrowserLocation(
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Coords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      {
        timeout: timeoutMs,
        maximumAge: MAX_AGE_MS,
        enableHighAccuracy: false,
      },
    );
  });
}

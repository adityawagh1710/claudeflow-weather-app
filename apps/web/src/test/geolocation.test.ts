// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestBrowserLocation } from "@/lib/geolocation";

describe("requestBrowserLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (navigator as { geolocation?: unknown }).geolocation;
  });

  it("resolves coordinates on success", async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) =>
      success({
        coords: { latitude: 40.71, longitude: -74.0 },
      } as GeolocationPosition),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(requestBrowserLocation()).resolves.toEqual({
      latitude: 40.71,
      longitude: -74.0,
    });
  });

  it("resolves null when permission is denied/errors", async () => {
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) =>
        error?.({ code: 1, message: "denied" } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    await expect(requestBrowserLocation()).resolves.toBeNull();
  });

  it("resolves null when geolocation is unavailable", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });
    await expect(requestBrowserLocation()).resolves.toBeNull();
  });
});

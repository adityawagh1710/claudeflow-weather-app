// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  _reset,
  getInstallId,
  setAnalyticsOptIn,
  setAnalyticsTransport,
  track,
  trackingAllowedByBrowser,
  type AnalyticsRecord,
} from "@/lib/analytics";

function setDnt(value: string | undefined): void {
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    value,
  });
}

function setGpc(value: boolean | undefined): void {
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  setDnt(undefined);
  setGpc(undefined);
});

afterEach(() => {
  _reset();
});

describe("track gating", () => {
  it("is a no-op when opted out", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(false);
    track("location_searched");
    expect(records).toHaveLength(0);
  });

  it("is a no-op when Do-Not-Track is set", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(true);
    setDnt("1");
    track("location_searched");
    expect(records).toHaveLength(0);
  });

  it("is a no-op when Global Privacy Control is set", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(true);
    setGpc(true);
    track("theme_changed", { theme: "dark" });
    expect(records).toHaveLength(0);
  });

  it("records the event when opted in and no DNT/GPC", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(true);
    track("theme_changed", { theme: "dark" });
    expect(records).toHaveLength(1);
    expect(records[0].event).toBe("theme_changed");
    expect(records[0].payload).toEqual({ theme: "dark" });
    expect(records[0].installId).toBeTypeOf("string");
  });
});

describe("trackingAllowedByBrowser", () => {
  it("respects DNT and GPC", () => {
    expect(trackingAllowedByBrowser()).toBe(true);
    setDnt("1");
    expect(trackingAllowedByBrowser()).toBe(false);
    setDnt(undefined);
    setGpc(true);
    expect(trackingAllowedByBrowser()).toBe(false);
  });
});

describe("getInstallId", () => {
  it("is stable within the rotation window", () => {
    const a = getInstallId(1_000);
    const b = getInstallId(2_000);
    expect(a).toBe(b);
  });

  it("rotates after the rotation window", () => {
    const a = getInstallId(0);
    const later = 31 * 24 * 60 * 60 * 1000;
    const b = getInstallId(later);
    expect(b).not.toBe(a);
  });
});

describe("payload privacy", () => {
  it("strips non-whitelisted keys (no query text, coords, or user id)", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(true);
    // Attempt to smuggle PII through the payload.
    track("location_searched", {
      query: "London",
      lat: "51.5072",
      userId: "u-123",
    } as never);
    expect(records).toHaveLength(1);
    expect(records[0].payload).toEqual({});
    const serialized = JSON.stringify(records[0]);
    expect(serialized).not.toContain("London");
    expect(serialized).not.toContain("51.5072");
    expect(serialized).not.toContain("u-123");
  });

  it("whitelists only unit + value for unit_toggled", () => {
    const records: AnalyticsRecord[] = [];
    setAnalyticsTransport((r) => records.push(r));
    setAnalyticsOptIn(true);
    track("unit_toggled", {
      unit: "temp",
      value: "celsius",
      secret: "leak",
    } as never);
    expect(records[0].payload).toEqual({ unit: "temp", value: "celsius" });
  });
});

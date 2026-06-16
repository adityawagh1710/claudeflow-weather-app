import { describe, expect, it } from "vitest";
import { MetricsRegistry, percentile } from "@/lib/metrics";

describe("percentile", () => {
  it("returns 0 for empty input", () => {
    expect(percentile([], 95)).toBe(0);
  });

  it("computes p50 and p95 by nearest rank", () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    expect(percentile(samples, 50)).toBe(50);
    expect(percentile(samples, 95)).toBe(95);
    expect(percentile(samples, 100)).toBe(100);
  });

  it("clamps out-of-range percentiles", () => {
    expect(percentile([10, 20, 30], 0)).toBe(10);
    expect(percentile([10, 20, 30], 200)).toBe(30);
  });
});

describe("MetricsRegistry", () => {
  it("increments request and error counters", () => {
    const reg = new MetricsRegistry();
    reg.recordRequest({ route: "/api/weather", status: 200, durationMs: 10 });
    reg.recordRequest({ route: "/api/weather", status: 500, durationMs: 20 });
    reg.recordRequest({
      route: "/api/weather",
      status: 200,
      durationMs: 30,
      cacheHit: true,
    });
    const snap = reg.snapshot();
    const route = snap.routes.find((r) => r.route === "/api/weather");
    expect(route).toBeDefined();
    expect(route?.count).toBe(3);
    expect(route?.errors).toBe(1);
    expect(route?.errorRate).toBeCloseTo(1 / 3);
    expect(route?.cacheHits).toBe(1);
    expect(route?.cacheHitRate).toBeCloseTo(1 / 3);
  });

  it("tracks providers and counts >=400 as errors", () => {
    const reg = new MetricsRegistry();
    reg.recordProvider({ provider: "open-meteo", status: 200, durationMs: 5 });
    reg.recordProvider({ provider: "open-meteo", status: 502, durationMs: 9 });
    const snap = reg.snapshot();
    const p = snap.providers.find((x) => x.provider === "open-meteo");
    expect(p?.count).toBe(2);
    expect(p?.errors).toBe(1);
    expect(p?.errorRate).toBe(0.5);
  });

  it("produces a well-formed snapshot shape", () => {
    const reg = new MetricsRegistry();
    reg.recordRequest({ route: "/api/geocode", status: 200, durationMs: 7 });
    const snap = reg.snapshot();
    expect(snap.capturedAt).toBeTypeOf("string");
    expect(Array.isArray(snap.routes)).toBe(true);
    expect(Array.isArray(snap.providers)).toBe(true);
    const r = snap.routes[0];
    expect(r).toHaveProperty("p50");
    expect(r).toHaveProperty("p95");
    expect(r).toHaveProperty("errorRate");
    expect(r).toHaveProperty("cacheHitRate");
  });

  it("resets state", () => {
    const reg = new MetricsRegistry();
    reg.recordRequest({ route: "/api/x", status: 200, durationMs: 1 });
    reg.reset();
    expect(reg.snapshot().routes).toHaveLength(0);
  });
});

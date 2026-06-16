import { describe, it, expect } from "vitest";
import { wmoLabel, wmoIcon } from "@/lib/wmo";

describe("wmo", () => {
  it("maps 0 to Clear sky", () => {
    expect(wmoLabel(0)).toBe("Clear sky");
  });

  it("maps 61 to Slight rain", () => {
    expect(wmoLabel(61)).toBe("Slight rain");
  });

  it("maps 95 to Thunderstorm", () => {
    expect(wmoLabel(95)).toBe("Thunderstorm");
  });

  it("returns Unknown for unmapped codes", () => {
    expect(wmoLabel(1234)).toBe("Unknown");
  });

  it("returns an icon for known codes", () => {
    expect(wmoIcon(0)).toBe("☀️");
  });

  it("returns fallback icon for unknown codes", () => {
    expect(wmoIcon(1234)).toBe("❓");
  });
});

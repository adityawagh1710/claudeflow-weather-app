import { describe, it, expect } from "vitest";
import { conditionFamily, sceneKey } from "@/lib/weatherCondition";

describe("conditionFamily", () => {
  it("maps clear codes", () => {
    expect(conditionFamily(0)).toBe("clear");
    expect(conditionFamily(1)).toBe("clear");
  });
  it("maps cloudy codes", () => {
    expect(conditionFamily(2)).toBe("cloudy");
    expect(conditionFamily(3)).toBe("cloudy");
  });
  it("maps fog codes", () => {
    expect(conditionFamily(45)).toBe("fog");
    expect(conditionFamily(48)).toBe("fog");
  });
  it("maps snow codes including showers", () => {
    expect(conditionFamily(71)).toBe("snow");
    expect(conditionFamily(75)).toBe("snow");
    expect(conditionFamily(86)).toBe("snow");
  });
  it("maps thunderstorm codes", () => {
    expect(conditionFamily(95)).toBe("thunder");
    expect(conditionFamily(99)).toBe("thunder");
  });
  it("falls back to rain for drizzle/rain/showers", () => {
    expect(conditionFamily(51)).toBe("rain");
    expect(conditionFamily(65)).toBe("rain");
    expect(conditionFamily(82)).toBe("rain");
  });
});

describe("sceneKey", () => {
  it("distinguishes clear day vs night", () => {
    expect(sceneKey(0, true)).toBe("clear-day");
    expect(sceneKey(0, false)).toBe("clear-night");
  });
  it("uses the family for non-clear codes regardless of day", () => {
    expect(sceneKey(3, true)).toBe("cloudy");
    expect(sceneKey(95, false)).toBe("thunder");
    expect(sceneKey(71, true)).toBe("snow");
  });
});

import { describe, it, expect } from "vitest";
import { parseLatLon, parseQuery } from "@/lib/validation";
import { ValidationError } from "@/lib/types";

function params(obj: Record<string, string>): URLSearchParams {
  return new URLSearchParams(obj);
}

describe("parseLatLon", () => {
  it("parses valid lat/lon", () => {
    expect(parseLatLon(params({ lat: "51.5", lon: "-0.12" }))).toEqual({
      lat: 51.5,
      lon: -0.12,
    });
  });

  it("accepts boundary values", () => {
    expect(parseLatLon(params({ lat: "-90", lon: "-180" }))).toEqual({
      lat: -90,
      lon: -180,
    });
    expect(parseLatLon(params({ lat: "90", lon: "180" }))).toEqual({
      lat: 90,
      lon: 180,
    });
  });

  it("throws when lat is missing", () => {
    expect(() => parseLatLon(params({ lon: "0" }))).toThrow(ValidationError);
  });

  it("throws when lon is missing", () => {
    expect(() => parseLatLon(params({ lat: "0" }))).toThrow(ValidationError);
  });

  it("throws when lat is out of range (high)", () => {
    expect(() => parseLatLon(params({ lat: "91", lon: "0" }))).toThrow(
      /lat must be a number/,
    );
  });

  it("throws when lat is out of range (low)", () => {
    expect(() => parseLatLon(params({ lat: "-91", lon: "0" }))).toThrow(
      /lat must be a number/,
    );
  });

  it("throws when lat is not finite", () => {
    expect(() => parseLatLon(params({ lat: "abc", lon: "0" }))).toThrow(
      /lat must be a number/,
    );
  });

  it("throws when lon is out of range (high)", () => {
    expect(() => parseLatLon(params({ lat: "0", lon: "181" }))).toThrow(
      /lon must be a number/,
    );
  });

  it("throws when lon is out of range (low)", () => {
    expect(() => parseLatLon(params({ lat: "0", lon: "-181" }))).toThrow(
      /lon must be a number/,
    );
  });

  it("throws when lon is not finite", () => {
    expect(() => parseLatLon(params({ lat: "0", lon: "xyz" }))).toThrow(
      /lon must be a number/,
    );
  });
});

describe("parseQuery", () => {
  it("trims and returns a valid query", () => {
    expect(parseQuery("  Paris  ")).toBe("Paris");
  });

  it("throws when q is null", () => {
    expect(() => parseQuery(null)).toThrow(/q is required/);
  });

  it("throws when q is empty after trim", () => {
    expect(() => parseQuery("   ")).toThrow(/must not be empty/);
  });

  it("throws when q exceeds 100 characters", () => {
    expect(() => parseQuery("a".repeat(101))).toThrow(/at most 100/);
  });

  it("accepts a query of exactly 100 characters", () => {
    const q = "a".repeat(100);
    expect(parseQuery(q)).toBe(q);
  });
});

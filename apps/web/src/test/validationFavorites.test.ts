import { describe, it, expect } from "vitest";
import {
  parseLatitude,
  parseLongitude,
  parseTextField,
  parseFavoriteInput,
  parseFavoriteUpdate,
  parsePreferencesInput,
} from "@/lib/validation";
import { ValidationError } from "@/lib/types";

describe("parseLatitude / parseLongitude", () => {
  it("accepts valid values", () => {
    expect(parseLatitude(51.5)).toBe(51.5);
    expect(parseLongitude("-0.12")).toBe(-0.12);
  });
  it("rejects out-of-range", () => {
    expect(() => parseLatitude(91)).toThrow(ValidationError);
    expect(() => parseLatitude(-91)).toThrow(/latitude/);
    expect(() => parseLongitude(181)).toThrow(/longitude/);
    expect(() => parseLongitude("nope")).toThrow(ValidationError);
  });
});

describe("parseTextField", () => {
  it("trims and validates", () => {
    expect(parseTextField("  Paris ", "name")).toBe("Paris");
  });
  it("rejects non-strings, empty, and overlong", () => {
    expect(() => parseTextField(5, "name")).toThrow(/must be a string/);
    expect(() => parseTextField("   ", "name")).toThrow(/must not be empty/);
    expect(() => parseTextField("a".repeat(201), "name")).toThrow(/at most/);
  });
});

describe("parseFavoriteInput", () => {
  it("parses a full valid payload", () => {
    expect(
      parseFavoriteInput({
        name: "London",
        latitude: 51.5,
        longitude: -0.12,
        country: "GB",
        admin1: "England",
        sortOrder: 3,
      }),
    ).toEqual({
      name: "London",
      latitude: 51.5,
      longitude: -0.12,
      country: "GB",
      admin1: "England",
      sortOrder: 3,
    });
  });

  it("accepts snake_case sort_order and omitted optionals", () => {
    const out = parseFavoriteInput({
      name: "X",
      latitude: 0,
      longitude: 0,
      sort_order: 2,
    });
    expect(out.sortOrder).toBe(2);
    expect(out.country).toBeUndefined();
  });

  it("rejects non-objects and bad fields", () => {
    expect(() => parseFavoriteInput(null)).toThrow(/JSON object/);
    expect(() => parseFavoriteInput([])).toThrow(/JSON object/);
    expect(() =>
      parseFavoriteInput({ name: "X", latitude: 0, longitude: 0, sortOrder: -1 }),
    ).toThrow(/non-negative integer/);
    expect(() =>
      parseFavoriteInput({ latitude: 0, longitude: 0 }),
    ).toThrow(/name/);
  });
});

describe("parseFavoriteUpdate", () => {
  it("accepts rename only", () => {
    expect(parseFavoriteUpdate({ name: "New" })).toEqual({ name: "New" });
  });
  it("accepts reorder only (snake_case)", () => {
    expect(parseFavoriteUpdate({ sort_order: 4 })).toEqual({ sortOrder: 4 });
  });
  it("requires at least one field", () => {
    expect(() => parseFavoriteUpdate({})).toThrow(/at least one/);
    expect(() => parseFavoriteUpdate(null)).toThrow(/JSON object/);
    expect(() => parseFavoriteUpdate({ sortOrder: -2 })).toThrow(
      /non-negative/,
    );
  });
});

describe("parsePreferencesInput", () => {
  it("parses valid enums (camelCase)", () => {
    expect(
      parsePreferencesInput({
        tempUnit: "fahrenheit",
        windUnit: "mph",
        timeFormat: "12h",
        theme: "dark",
      }),
    ).toEqual({
      tempUnit: "fahrenheit",
      windUnit: "mph",
      timeFormat: "12h",
      theme: "dark",
    });
  });

  it("parses snake_case enums", () => {
    expect(
      parsePreferencesInput({
        temp_unit: "celsius",
        wind_unit: "kmh",
        time_format: "24h",
        theme: "system",
      }).tempUnit,
    ).toBe("celsius");
  });

  it("rejects invalid enums and non-objects", () => {
    expect(() => parsePreferencesInput(null)).toThrow(/JSON object/);
    expect(() =>
      parsePreferencesInput({
        tempUnit: "kelvin",
        windUnit: "mph",
        timeFormat: "12h",
        theme: "dark",
      }),
    ).toThrow(/tempUnit/);
    expect(() =>
      parsePreferencesInput({
        tempUnit: "celsius",
        windUnit: "knots",
        timeFormat: "12h",
        theme: "dark",
      }),
    ).toThrow(/windUnit/);
    expect(() =>
      parsePreferencesInput({
        tempUnit: "celsius",
        windUnit: "kmh",
        timeFormat: "48h",
        theme: "dark",
      }),
    ).toThrow(/timeFormat/);
    expect(() =>
      parsePreferencesInput({
        tempUnit: "celsius",
        windUnit: "kmh",
        timeFormat: "24h",
        theme: "neon",
      }),
    ).toThrow(/theme/);
  });
});

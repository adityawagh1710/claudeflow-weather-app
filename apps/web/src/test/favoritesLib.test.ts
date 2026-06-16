import { describe, it, expect } from "vitest";
import {
  toFavorite,
  toFavorites,
  toFavoriteInsert,
  toFavoriteUpdate,
  toPreferences,
  toPreferencesUpsert,
  isUniqueViolation,
  PG_UNIQUE_VIOLATION,
  type FavoriteRow,
  type PreferencesRow,
} from "@/lib/favorites";

const row: FavoriteRow = {
  id: "f1",
  user_id: "u1",
  name: "London",
  latitude: 51.5,
  longitude: -0.12,
  country: "GB",
  admin1: "England",
  sort_order: 2,
  created_at: "2026-01-01T00:00:00Z",
};

describe("favorite mappers", () => {
  it("maps a row to the API shape", () => {
    expect(toFavorite(row)).toEqual({
      id: "f1",
      name: "London",
      latitude: 51.5,
      longitude: -0.12,
      country: "GB",
      admin1: "England",
      sortOrder: 2,
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("maps a list", () => {
    expect(toFavorites([row])).toHaveLength(1);
  });

  it("builds an insert payload with defaults", () => {
    expect(
      toFavoriteInsert(
        { name: "Paris", latitude: 48.85, longitude: 2.35 },
        "u1",
      ),
    ).toEqual({
      user_id: "u1",
      name: "Paris",
      latitude: 48.85,
      longitude: 2.35,
      country: null,
      admin1: null,
      sort_order: 0,
    });
  });

  it("builds a partial update payload", () => {
    expect(toFavoriteUpdate({ name: "X" })).toEqual({ name: "X" });
    expect(toFavoriteUpdate({ sortOrder: 5 })).toEqual({ sort_order: 5 });
    expect(toFavoriteUpdate({ name: "X", sortOrder: 5 })).toEqual({
      name: "X",
      sort_order: 5,
    });
    expect(toFavoriteUpdate({})).toEqual({});
  });
});

describe("preferences mappers", () => {
  const prow: PreferencesRow = {
    user_id: "u1",
    temp_unit: "fahrenheit",
    wind_unit: "mph",
    time_format: "12h",
    theme: "dark",
    updated_at: "2026-01-01T00:00:00Z",
  };

  it("maps preferences row", () => {
    expect(toPreferences(prow)).toEqual({
      tempUnit: "fahrenheit",
      windUnit: "mph",
      timeFormat: "12h",
      theme: "dark",
      updatedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("builds an upsert payload with owner + updated_at", () => {
    const out = toPreferencesUpsert(
      {
        tempUnit: "celsius",
        windUnit: "kmh",
        timeFormat: "24h",
        theme: "system",
      },
      "u1",
    );
    expect(out.user_id).toBe("u1");
    expect(out.temp_unit).toBe("celsius");
    expect(typeof out.updated_at).toBe("string");
  });
});

describe("isUniqueViolation", () => {
  it("detects the unique-violation code", () => {
    expect(isUniqueViolation({ code: PG_UNIQUE_VIOLATION })).toBe(true);
  });
  it("returns false for other errors", () => {
    expect(isUniqueViolation({ code: "other" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("x")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  parseLocalFavorites,
  addLocalFavorite,
  removeLocalFavorite,
  reorderLocalFavorites,
  renameLocalFavorite,
} from "@/lib/localFavorites";
import type { Favorite } from "@/lib/favorites";

function fav(id: string, order: number, lat = 0, lon = 0): Favorite {
  return {
    id,
    name: id,
    latitude: lat,
    longitude: lon,
    country: null,
    admin1: null,
    sortOrder: order,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("parseLocalFavorites", () => {
  it("returns [] for null/invalid", () => {
    expect(parseLocalFavorites(null)).toEqual([]);
    expect(parseLocalFavorites("not json")).toEqual([]);
    expect(parseLocalFavorites("{}")).toEqual([]);
  });
  it("parses and sorts by sortOrder", () => {
    const raw = JSON.stringify([fav("b", 1), fav("a", 0)]);
    expect(parseLocalFavorites(raw).map((f) => f.id)).toEqual(["a", "b"]);
  });
  it("drops malformed entries", () => {
    const raw = JSON.stringify([fav("a", 0), { id: 5 }]);
    expect(parseLocalFavorites(raw)).toHaveLength(1);
  });
});

describe("addLocalFavorite", () => {
  it("appends with next sort order", () => {
    const list = [fav("a", 0, 1, 1)];
    const out = addLocalFavorite(
      list,
      { name: "b", latitude: 2, longitude: 2 },
      "b",
      "now",
    );
    expect(out).toHaveLength(2);
    expect(out[1].sortOrder).toBe(1);
  });
  it("de-dupes on (lat, lon)", () => {
    const list = [fav("a", 0, 1, 1)];
    const out = addLocalFavorite(
      list,
      { name: "dup", latitude: 1, longitude: 1 },
      "x",
      "now",
    );
    expect(out).toHaveLength(1);
  });
});

describe("removeLocalFavorite", () => {
  it("removes by id", () => {
    const list = [fav("a", 0), fav("b", 1, 2, 2)];
    expect(removeLocalFavorite(list, "a").map((f) => f.id)).toEqual(["b"]);
  });
});

describe("reorderLocalFavorites", () => {
  it("moves an item and renumbers", () => {
    const list = [fav("a", 0, 1, 1), fav("b", 1, 2, 2), fav("c", 2, 3, 3)];
    const out = reorderLocalFavorites(list, "c", 0);
    expect(out.map((f) => f.id)).toEqual(["c", "a", "b"]);
    expect(out.map((f) => f.sortOrder)).toEqual([0, 1, 2]);
  });
  it("no-ops for unknown id", () => {
    const list = [fav("a", 0)];
    expect(reorderLocalFavorites(list, "zzz", 0)).toHaveLength(1);
  });
  it("clamps target index", () => {
    const list = [fav("a", 0, 1, 1), fav("b", 1, 2, 2)];
    expect(reorderLocalFavorites(list, "a", 99).map((f) => f.id)).toEqual([
      "b",
      "a",
    ]);
  });
});

describe("renameLocalFavorite", () => {
  it("renames by id", () => {
    const list = [fav("a", 0)];
    expect(renameLocalFavorite(list, "a", "New")[0].name).toBe("New");
  });
});

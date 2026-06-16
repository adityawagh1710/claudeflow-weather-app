import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchFavorites,
  createFavorite,
  patchFavorite,
  deleteFavorite,
  fetchPreferences,
  putPreferences,
} from "@/lib/favoritesApi";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

const fav = {
  id: "f1",
  name: "London",
  latitude: 51.5,
  longitude: -0.12,
  country: "GB",
  admin1: null,
  sortOrder: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

const prefs = {
  tempUnit: "celsius",
  windUnit: "kmh",
  timeFormat: "24h",
  theme: "system",
  updatedAt: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(res: Response) {
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(res);
}

describe("favoritesApi", () => {
  it("fetchFavorites returns list and sends bearer token", async () => {
    mockFetch(jsonResponse({ favorites: [fav] }));
    const out = await fetchFavorites("tok");
    expect(out).toEqual([fav]);
    const call = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((call[1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok",
    });
  });

  it("createFavorite posts and returns the favorite", async () => {
    mockFetch(jsonResponse({ favorite: fav }));
    const out = await createFavorite("tok", {
      name: "London",
      latitude: 51.5,
      longitude: -0.12,
    });
    expect(out.id).toBe("f1");
  });

  it("patchFavorite returns the updated favorite", async () => {
    mockFetch(jsonResponse({ favorite: { ...fav, name: "X" } }));
    const out = await patchFavorite("tok", "f1", { name: "X" });
    expect(out.name).toBe("X");
  });

  it("deleteFavorite resolves on ok", async () => {
    mockFetch(jsonResponse({ ok: true }));
    await expect(deleteFavorite("tok", "f1")).resolves.toBeUndefined();
  });

  it("fetchPreferences returns prefs", async () => {
    mockFetch(jsonResponse({ preferences: prefs }));
    const out = await fetchPreferences("tok");
    expect(out?.tempUnit).toBe("celsius");
  });

  it("putPreferences returns saved prefs", async () => {
    mockFetch(jsonResponse({ preferences: prefs }));
    const out = await putPreferences("tok", {
      tempUnit: "celsius",
      windUnit: "kmh",
      timeFormat: "24h",
      theme: "system",
    });
    expect(out.theme).toBe("system");
  });

  it("throws the server error message on non-ok", async () => {
    mockFetch(jsonResponse({ error: "nope" }, false, 401));
    await expect(fetchFavorites("tok")).rejects.toThrow("nope");
  });

  it("throws a generic message when body has no error", async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);
    await expect(deleteFavorite("tok", "f1")).rejects.toThrow(/failed/i);
  });
});

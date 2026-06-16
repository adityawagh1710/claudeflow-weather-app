import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration tests for /api/favorites with a MOCKED Supabase client and
 * mocked token verification. No live backend required.
 */

const verifyAccessToken = vi.fn();
const getServerClient = vi.fn();
const isSupabaseConfigured = vi.fn(() => true);

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, verifyAccessToken };
});
vi.mock("@/lib/supabase", () => ({
  getServerClient,
  isSupabaseConfigured,
}));

/** Build a chainable query-builder mock whose terminal resolves to `result`. */
function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "insert", "update", "delete"];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  // For terminal awaits (e.g. delete / order list) make the chain thenable.
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

function mockClient(result: { data: unknown; error: unknown }) {
  const chain = builder(result);
  getServerClient.mockReturnValue({ from: vi.fn(() => chain) });
  return chain;
}

function req(method: string, body?: unknown, withAuth = true): Request {
  return new Request("http://localhost/api/favorites", {
    method,
    headers: withAuth
      ? { authorization: "Bearer tok", "content-type": "application/json" }
      : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfigured.mockReturnValue(true);
});

describe("GET /api/favorites", () => {
  it("401 when no token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { GET } = await import("@/app/api/favorites/route");
    const res = await GET(req("GET", undefined, false));
    expect(res.status).toBe(401);
  });

  it("lists favorites ordered by sort_order", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({
      data: [
        {
          id: "f1",
          user_id: "user-1",
          name: "London",
          latitude: 51.5,
          longitude: -0.12,
          country: "GB",
          admin1: "England",
          sort_order: 0,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    const { GET } = await import("@/app/api/favorites/route");
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { favorites: Array<{ id: string }> };
    expect(body.favorites[0].id).toBe("f1");
  });

  it("503 when Supabase unconfigured", async () => {
    isSupabaseConfigured.mockReturnValue(false);
    const { GET } = await import("@/app/api/favorites/route");
    const res = await GET(req("GET"));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/favorites", () => {
  it("401 without token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(
      req("POST", { name: "X", latitude: 0, longitude: 0 }, false),
    );
    expect(res.status).toBe(401);
  });

  it("400 on invalid input", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: null });
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(req("POST", { name: "", latitude: 0, longitude: 0 }));
    expect(res.status).toBe(400);
  });

  it("201 on happy-path create", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({
      data: {
        id: "f9",
        user_id: "user-1",
        name: "Paris",
        latitude: 48.85,
        longitude: 2.35,
        country: "FR",
        admin1: null,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(
      req("POST", { name: "Paris", latitude: 48.85, longitude: 2.35, country: "FR" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { favorite: { id: string } };
    expect(body.favorite.id).toBe("f9");
  });

  it("409 on unique-constraint violation", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: { code: "23505" } });
    const { POST } = await import("@/app/api/favorites/route");
    const res = await POST(
      req("POST", { name: "Dup", latitude: 1, longitude: 1 }),
    );
    expect(res.status).toBe(409);
  });
});

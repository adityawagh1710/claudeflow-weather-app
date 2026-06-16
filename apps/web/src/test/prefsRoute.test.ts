import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyAccessToken = vi.fn();
const getServerClient = vi.fn();
const isSupabaseConfigured = vi.fn(() => true);

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, verifyAccessToken };
});
vi.mock("@/lib/supabase", () => ({ getServerClient, isSupabaseConfigured }));

function builder(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "upsert"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.maybeSingle = vi.fn(async () => result);
  return chain;
}

function mockClient(result: { data: unknown; error: unknown }) {
  getServerClient.mockReturnValue({ from: vi.fn(() => builder(result)) });
}

function req(method: string, body?: unknown, withAuth = true): Request {
  return new Request("http://localhost/api/prefs", {
    method,
    headers: withAuth
      ? { authorization: "Bearer tok", "content-type": "application/json" }
      : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const VALID_PREFS = {
  tempUnit: "fahrenheit",
  windUnit: "mph",
  timeFormat: "12h",
  theme: "dark",
};

beforeEach(() => {
  vi.clearAllMocks();
  isSupabaseConfigured.mockReturnValue(true);
});

describe("GET /api/prefs", () => {
  it("401 without token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { GET } = await import("@/app/api/prefs/route");
    const res = await GET(req("GET", undefined, false));
    expect(res.status).toBe(401);
  });

  it("returns preferences", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({
      data: {
        user_id: "user-1",
        temp_unit: "celsius",
        wind_unit: "kmh",
        time_format: "24h",
        theme: "system",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const { GET } = await import("@/app/api/prefs/route");
    const res = await GET(req("GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { preferences: { tempUnit: string } };
    expect(body.preferences.tempUnit).toBe("celsius");
  });

  it("returns null when no row exists", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: null });
    const { GET } = await import("@/app/api/prefs/route");
    const res = await GET(req("GET"));
    const body = (await res.json()) as { preferences: unknown };
    expect(body.preferences).toBeNull();
  });
});

describe("PUT /api/prefs", () => {
  it("401 without token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { PUT } = await import("@/app/api/prefs/route");
    const res = await PUT(req("PUT", VALID_PREFS, false));
    expect(res.status).toBe(401);
  });

  it("400 on invalid enum", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: null });
    const { PUT } = await import("@/app/api/prefs/route");
    const res = await PUT(req("PUT", { ...VALID_PREFS, tempUnit: "kelvin" }));
    expect(res.status).toBe(400);
  });

  it("200 on valid upsert", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({
      data: {
        user_id: "user-1",
        temp_unit: "fahrenheit",
        wind_unit: "mph",
        time_format: "12h",
        theme: "dark",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    const { PUT } = await import("@/app/api/prefs/route");
    const res = await PUT(req("PUT", VALID_PREFS));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { preferences: { theme: string } };
    expect(body.preferences.theme).toBe("dark");
  });
});

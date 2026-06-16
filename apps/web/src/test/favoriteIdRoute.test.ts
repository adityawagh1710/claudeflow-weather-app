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
  for (const m of ["select", "eq", "update", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

function mockClient(result: { data: unknown; error: unknown }) {
  getServerClient.mockReturnValue({ from: vi.fn(() => builder(result)) });
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function req(method: string, body?: unknown, withAuth = true): Request {
  return new Request("http://localhost/api/favorites/f1", {
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

describe("PATCH /api/favorites/:id", () => {
  it("401 without token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/favorites/[id]/route");
    const res = await PATCH(req("PATCH", { name: "X" }, false), ctx("f1"));
    expect(res.status).toBe(401);
  });

  it("400 on empty patch", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: null });
    const { PATCH } = await import("@/app/api/favorites/[id]/route");
    const res = await PATCH(req("PATCH", {}), ctx("f1"));
    expect(res.status).toBe(400);
  });

  it("200 on rename", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({
      data: {
        id: "f1",
        user_id: "user-1",
        name: "Renamed",
        latitude: 0,
        longitude: 0,
        country: null,
        admin1: null,
        sort_order: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    const { PATCH } = await import("@/app/api/favorites/[id]/route");
    const res = await PATCH(req("PATCH", { name: "Renamed" }), ctx("f1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { favorite: { name: string } };
    expect(body.favorite.name).toBe("Renamed");
  });
});

describe("DELETE /api/favorites/:id", () => {
  it("401 without token", async () => {
    verifyAccessToken.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/favorites/[id]/route");
    const res = await DELETE(req("DELETE", undefined, false), ctx("f1"));
    expect(res.status).toBe(401);
  });

  it("200 on delete", async () => {
    verifyAccessToken.mockResolvedValue("user-1");
    mockClient({ data: null, error: null });
    const { DELETE } = await import("@/app/api/favorites/[id]/route");
    const res = await DELETE(req("DELETE"), ctx("f1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

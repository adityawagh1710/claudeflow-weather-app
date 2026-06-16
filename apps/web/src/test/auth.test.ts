import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBearerToken } from "@/lib/auth";

describe("getBearerToken", () => {
  it("extracts a bearer token from Headers", () => {
    const h = new Headers({ authorization: "Bearer abc.def.ghi" });
    expect(getBearerToken(h)).toBe("abc.def.ghi");
  });
  it("is case-insensitive on the scheme", () => {
    const h = new Headers({ authorization: "bearer xyz" });
    expect(getBearerToken(h)).toBe("xyz");
  });
  it("reads from a plain record", () => {
    expect(getBearerToken({ authorization: "Bearer t1" })).toBe("t1");
    expect(getBearerToken({ Authorization: "Bearer t2" })).toBe("t2");
  });
  it("returns null when missing or malformed", () => {
    expect(getBearerToken(new Headers())).toBeNull();
    expect(getBearerToken({ authorization: "Basic foo" })).toBeNull();
    expect(getBearerToken({ authorization: "Bearer   " })).toBeNull();
  });
});

describe("verifyAccessToken", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns null without a token", async () => {
    const { verifyAccessToken } = await import("@/lib/auth");
    expect(await verifyAccessToken(null)).toBeNull();
  });

  it("returns null when Supabase is unconfigured", async () => {
    vi.doMock("@/lib/supabase", () => ({
      isSupabaseConfigured: () => false,
      getServerClient: () => {
        throw new Error("should not be called");
      },
    }));
    const { verifyAccessToken } = await import("@/lib/auth");
    expect(await verifyAccessToken("tok")).toBeNull();
  });

  it("returns the user id for a valid token", async () => {
    vi.doMock("@/lib/supabase", () => ({
      isSupabaseConfigured: () => true,
      getServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
        },
      }),
    }));
    const { verifyAccessToken } = await import("@/lib/auth");
    expect(await verifyAccessToken("tok")).toBe("user-1");
  });

  it("returns null when Supabase rejects the token", async () => {
    vi.doMock("@/lib/supabase", () => ({
      isSupabaseConfigured: () => true,
      getServerClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: { message: "bad" } }),
        },
      }),
    }));
    const { verifyAccessToken } = await import("@/lib/auth");
    expect(await verifyAccessToken("tok")).toBeNull();
  });
});

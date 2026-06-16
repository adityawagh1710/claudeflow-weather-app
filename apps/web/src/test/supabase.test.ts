import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn((url: string, key: string, opts: unknown) => ({
    url,
    key,
    opts,
  })),
}));

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

function clearEnv() {
  for (const k of ENV_KEYS) {
    delete process.env[k];
  }
}

beforeEach(() => {
  vi.resetModules();
  clearEnv();
});
afterEach(() => {
  clearEnv();
});

describe("isSupabaseConfigured", () => {
  it("false when env missing", async () => {
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("true when url + anon present", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    const { isSupabaseConfigured } = await import("@/lib/supabase");
    expect(isSupabaseConfigured()).toBe(true);
  });
});

describe("getBrowserClient", () => {
  it("throws when unconfigured", async () => {
    const { getBrowserClient, SupabaseConfigError } = await import(
      "@/lib/supabase"
    );
    expect(() => getBrowserClient()).toThrow(SupabaseConfigError);
  });

  it("returns a client when configured", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    const { getBrowserClient } = await import("@/lib/supabase");
    expect(getBrowserClient()).toBeTruthy();
  });
});

describe("getServerClient", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("throws when unconfigured", async () => {
    clearEnv();
    const { getServerClient, SupabaseConfigError } = await import(
      "@/lib/supabase"
    );
    expect(() => getServerClient()).toThrow(SupabaseConfigError);
  });

  it("uses the access token header when provided", async () => {
    const { getServerClient } = await import("@/lib/supabase");
    const client = getServerClient("tok") as unknown as {
      opts: { global: { headers: Record<string, string> } };
    };
    expect(client.opts.global.headers.Authorization).toBe("Bearer tok");
  });

  it("falls back to service role key without a token", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
    const { getServerClient } = await import("@/lib/supabase");
    const client = getServerClient() as unknown as { key: string };
    expect(client.key).toBe("service");
  });
});

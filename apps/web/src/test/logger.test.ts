import { afterEach, describe, expect, it, vi } from "vitest";
import {
  coarseCoord,
  createLogger,
  getRequestId,
  scrub,
  timeProvider,
  withRequestLogging,
  type Logger,
} from "@/lib/logger";

function captureLogger(): { log: Logger; lines: string[] } {
  const lines: string[] = [];
  return { log: createLogger((l) => lines.push(l)), lines };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("scrub", () => {
  it("redacts email addresses", () => {
    const out = scrub("contact me at jane.doe@example.com please") as string;
    expect(out).not.toContain("jane.doe@example.com");
    expect(out).toContain("[redacted]");
  });

  it("redacts bearer and jwt tokens", () => {
    const bearer = scrub("Authorization: Bearer abc123.def-456") as string;
    expect(bearer).not.toContain("abc123.def-456");
    const jwt = scrub(
      "token eyJhbGciOiJ.eyJzdWIiOiIx.SflKxwRJ_aXf",
    ) as string;
    expect(jwt).toContain("[redacted]");
    expect(jwt).not.toContain("eyJhbGciOiJ");
  });

  it("redacts IPv4 addresses", () => {
    const out = scrub("client 192.168.1.42 connected") as string;
    expect(out).not.toContain("192.168.1.42");
  });

  it("coarsens coordinate-like numbers in nested context", () => {
    const out = scrub({ lat: 51.50729, lon: -0.12765, count: 5 }) as {
      lat: number;
      lon: number;
      count: number;
    };
    expect(out.lat).toBe(51.51);
    expect(out.lon).toBe(-0.13);
    expect(out.count).toBe(5);
  });
});

describe("coarseCoord", () => {
  it("rounds to 2 decimal places", () => {
    expect(coarseCoord(51.50729)).toBe(51.51);
    expect(coarseCoord(-0.12399)).toBe(-0.12);
    expect(coarseCoord(0)).toBe(0);
  });
});

describe("getRequestId", () => {
  it("passes through an incoming x-request-id (Headers)", () => {
    const headers = new Headers({ "x-request-id": "abc-123" });
    expect(getRequestId(headers)).toBe("abc-123");
  });

  it("passes through from a plain map", () => {
    expect(getRequestId({ "x-request-id": "plain-1" })).toBe("plain-1");
  });

  it("generates a uuid when absent", () => {
    const id = getRequestId(new Headers());
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("createLogger", () => {
  it("emits a JSON line with required fields and no PII", () => {
    const lines: string[] = [];
    const log = createLogger((line) => lines.push(line));
    log.info("request.complete", {
      requestId: "rid-1",
      route: "/api/weather",
      method: "GET",
      status: 200,
      durationMs: 12,
      cacheHit: true,
      provider: "open-meteo",
      context: { email: "a@b.com", lat: 51.50729 },
    });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.timestamp).toBeTypeOf("string");
    expect(parsed.level).toBe("info");
    expect(parsed.requestId).toBe("rid-1");
    expect(parsed.route).toBe("/api/weather");
    expect(parsed.method).toBe("GET");
    expect(parsed.status).toBe(200);
    expect(parsed.durationMs).toBe(12);
    expect(parsed.cacheHit).toBe(true);
    expect(parsed.provider).toBe("open-meteo");
    expect(lines[0]).not.toContain("a@b.com");
    expect(lines[0]).toContain("51.51");
  });

  it("respects LOG_LEVEL=debug in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "debug");
    const { log, lines } = captureLogger();
    log.debug("dbg");
    expect(lines).toHaveLength(1);
  });

  it("emits all severity helpers", () => {
    const { log, lines } = captureLogger();
    log.warn("w");
    log.error("e");
    log.fatal("f");
    expect(lines).toHaveLength(3);
  });

  it("suppresses debug unless enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "");
    const lines: string[] = [];
    const log = createLogger((line) => lines.push(line));
    log.debug("nope");
    log.info("yep");
    expect(lines).toHaveLength(1);
  });
});

describe("withRequestLogging", () => {
  it("logs completion and echoes x-request-id", async () => {
    const { log, lines } = captureLogger();
    const req = new Request("http://x/api/weather", {
      headers: { "x-request-id": "rid-9" },
    });
    const res = await withRequestLogging(
      req,
      "/api/weather",
      async () => new Response("ok", { status: 200 }),
      log,
    );
    expect(res.headers.get("x-request-id")).toBe("rid-9");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.message).toBe("request.complete");
    expect(parsed.status).toBe(200);
    expect(parsed.durationMs).toBeTypeOf("number");
  });

  it("logs failure and rethrows", async () => {
    const { log, lines } = captureLogger();
    const req = new Request("http://x/api/weather");
    await expect(
      withRequestLogging(
        req,
        "/api/weather",
        async () => {
          throw new Error("kaboom");
        },
        log,
      ),
    ).rejects.toThrow("kaboom");
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.message).toBe("request.failed");
  });
});

describe("timeProvider", () => {
  it("returns the result and logs a provider line", async () => {
    const { log, lines } = captureLogger();
    const out = await timeProvider("open-meteo", "rid", async () => 42, log);
    expect(out).toBe(42);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.provider).toBe("open-meteo");
    expect(parsed.status).toBe(200);
  });

  it("warns and rethrows on provider error", async () => {
    const { log, lines } = captureLogger();
    await expect(
      timeProvider(
        "ipapi",
        "rid",
        async () => {
          throw new Error("down");
        },
        log,
      ),
    ).rejects.toThrow("down");
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed.level).toBe("warn");
    expect(parsed.message).toBe("provider.error");
  });
});

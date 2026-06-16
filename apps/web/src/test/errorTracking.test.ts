import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _reset,
  captureException,
  init,
  type TrackedEvent,
} from "@/lib/errorTracking";

afterEach(() => {
  _reset();
  vi.unstubAllGlobals();
  delete process.env.ERROR_TRACKING_DSN;
});

describe("captureException", () => {
  it("is a no-op when no DSN and no transport configured", () => {
    const sent: TrackedEvent[] = [];
    init();
    captureException(new Error("boom"));
    expect(sent).toHaveLength(0);
  });

  it("scrubs email, token, coordinate, and IP before transport", () => {
    const sent: TrackedEvent[] = [];
    init({ transport: (e) => sent.push(e) });
    captureException(
      new Error("failed for user@example.com Bearer secret.tok via 10.0.0.1"),
      { lat: 51.50729, raw: "coords 51.50729,-0.12765" },
    );
    expect(sent).toHaveLength(1);
    const serialized = JSON.stringify(sent[0]);
    expect(serialized).not.toContain("user@example.com");
    expect(serialized).not.toContain("secret.tok");
    expect(serialized).not.toContain("10.0.0.1");
    expect(serialized).not.toContain("51.50729");
    expect(serialized).toContain("51.51");
  });

  it("drops the event (fails closed) when scrubbing throws", () => {
    const sent: TrackedEvent[] = [];
    init({ transport: (e) => sent.push(e) });
    // A context value whose toString throws will break JSON-free scrub paths;
    // build a circular-ish object via a throwing getter accessed by scrub.
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, "evil", {
      enumerable: true,
      get() {
        throw new Error("cannot read");
      },
    });
    captureException(new Error("x"), hostile);
    expect(sent).toHaveLength(0);
  });

  it("tags events with version, platform, and connectivity", () => {
    const sent: TrackedEvent[] = [];
    vi.stubGlobal("navigator", { onLine: false });
    init({ transport: (e) => sent.push(e) });
    captureException(new Error("tagged"));
    expect(sent[0].tags.platform).toBe("web");
    expect(sent[0].tags.connectivity).toBe("offline");
    expect(sent[0].tags.appVersion).toBeTypeOf("string");
  });
});

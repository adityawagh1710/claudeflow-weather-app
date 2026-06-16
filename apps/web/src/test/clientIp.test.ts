import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/clientIp";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("clientIp", () => {
  it("returns the first public IP from x-forwarded-for", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
  });

  it("returns null when no IP headers are present", () => {
    expect(clientIp(req({}))).toBeNull();
  });

  it.each([
    "127.0.0.1",
    "::1",
    "10.1.2.3",
    "192.168.0.5",
    "172.16.0.9",
    "172.31.255.1",
    "fd00::1",
  ])("treats private/loopback %s as null", (ip) => {
    expect(clientIp(req({ "x-forwarded-for": ip }))).toBeNull();
  });

  it("keeps public IPs outside the 172.16/12 private range", () => {
    expect(clientIp(req({ "x-forwarded-for": "172.15.0.1" }))).toBe("172.15.0.1");
    expect(clientIp(req({ "x-forwarded-for": "172.32.0.1" }))).toBe("172.32.0.1");
  });
});

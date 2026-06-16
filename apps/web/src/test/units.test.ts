import { describe, it, expect } from "vitest";
import {
  toFahrenheit,
  formatTemp,
  kmhToMph,
  formatWind,
  formatTime,
  formatDay,
  degToCompass,
} from "@/lib/units";

describe("temperature", () => {
  it("converts 0°C to 32°F", () => {
    expect(toFahrenheit(0)).toBe(32);
  });

  it("converts 100°C to 212°F", () => {
    expect(toFahrenheit(100)).toBe(212);
  });

  it("formats celsius rounded", () => {
    expect(formatTemp(21.4, "celsius")).toBe("21°C");
  });

  it("formats fahrenheit rounded", () => {
    expect(formatTemp(0, "fahrenheit")).toBe("32°F");
  });
});

describe("wind", () => {
  it("converts 100 km/h to ~62.14 mph", () => {
    expect(kmhToMph(100)).toBeCloseTo(62.1371, 3);
  });

  it("formats wind in mph", () => {
    expect(formatWind(100, "mph")).toBe("62 mph");
  });

  it("formats wind in kmh", () => {
    expect(formatWind(15.6, "kmh")).toBe("16 km/h");
  });
});

describe("compass", () => {
  it("maps 0 degrees to N", () => {
    expect(degToCompass(0)).toBe("N");
  });

  it("maps 90 degrees to E", () => {
    expect(degToCompass(90)).toBe("E");
  });

  it("maps 225 degrees to SW", () => {
    expect(degToCompass(225)).toBe("SW");
  });

  it("normalizes negative degrees", () => {
    expect(degToCompass(-90)).toBe("W");
  });
});

describe("time format", () => {
  it("formats 24h", () => {
    expect(formatTime("2024-01-01T09:05:00", "24h")).toBe("09:05");
  });

  it("formats 12h afternoon", () => {
    expect(formatTime("2024-01-01T13:05:00", "12h")).toBe("1:05 PM");
  });

  it("formats 12h midnight", () => {
    expect(formatTime("2024-01-01T00:30:00", "12h")).toBe("12:30 AM");
  });

  it("formats 12h noon", () => {
    expect(formatTime("2024-01-01T12:00:00", "12h")).toBe("12:00 PM");
  });

  it("returns -- for invalid time", () => {
    expect(formatTime("not-a-date", "24h")).toBe("--");
  });
});

describe("formatDay", () => {
  it("formats a weekday short name", () => {
    expect(formatDay("2024-01-01T00:00:00")).toBe("Mon");
  });

  it("returns -- for invalid date", () => {
    expect(formatDay("not-a-date")).toBe("--");
  });
});

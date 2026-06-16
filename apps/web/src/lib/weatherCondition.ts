/**
 * Maps WMO weather codes into a small set of visual "condition families".
 * Drives both the animated background atmosphere and the animated icons so
 * the UI reflects the actual sky. Pure data — no DOM, easily testable.
 */

export type ConditionFamily =
  | "clear"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "thunder";

/** Resolve a WMO code into a coarse visual family. */
export function conditionFamily(code: number): ConditionFamily {
  if (code === 0 || code === 1) {
    return "clear";
  }
  if (code === 2 || code === 3) {
    return "cloudy";
  }
  if (code === 45 || code === 48) {
    return "fog";
  }
  if (code === 71 || code === 73 || code === 75 || code === 77) {
    return "snow";
  }
  if (code === 85 || code === 86) {
    return "snow";
  }
  if (code === 95 || code === 96 || code === 99) {
    return "thunder";
  }
  // 51-67, 80-82: drizzle / rain / showers
  return "rain";
}

/**
 * A stable key combining family + day/night, used as the CSS scene selector
 * (e.g. `clear-day`, `clear-night`). Only `clear` distinguishes day vs night
 * visually; others reuse the day scene at night with a darker tone via tokens.
 */
export type SceneKey =
  | "clear-day"
  | "clear-night"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "thunder"
  | "neutral";

export function sceneKey(code: number, isDay: boolean): SceneKey {
  const family = conditionFamily(code);
  if (family === "clear") {
    return isDay ? "clear-day" : "clear-night";
  }
  return family;
}

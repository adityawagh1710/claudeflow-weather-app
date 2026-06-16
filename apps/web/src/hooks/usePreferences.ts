"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TempUnit,
  WindUnit,
  TimeFormat,
  Theme,
} from "@/lib/types";
import { setAnalyticsOptIn } from "@/lib/analytics";

export type Preferences = {
  tempUnit: TempUnit;
  windUnit: WindUnit;
  timeFormat: TimeFormat;
  theme: Theme;
  analyticsOptIn: boolean;
};

const STORAGE_KEY = "weather-prefs";

const DEFAULTS: Preferences = {
  tempUnit: "celsius",
  windUnit: "kmh",
  timeFormat: "24h",
  theme: "system",
  analyticsOptIn: false,
};

function readStored(): Preferences {
  if (typeof window === "undefined") {
    return DEFAULTS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setPrefs(stored);
    setAnalyticsOptIn(stored.analyticsOptIn);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (patch.analyticsOptIn !== undefined) {
        setAnalyticsOptIn(patch.analyticsOptIn);
      }
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore persistence failures (e.g. private mode)
        }
      }
      return next;
    });
  }, []);

  return {
    prefs,
    hydrated,
    setTempUnit: (tempUnit: TempUnit) => update({ tempUnit }),
    setWindUnit: (windUnit: WindUnit) => update({ windUnit }),
    setTimeFormat: (timeFormat: TimeFormat) => update({ timeFormat }),
    setTheme: (theme: Theme) => update({ theme }),
    setAnalyticsOptIn: (analyticsOptIn: boolean) => update({ analyticsOptIn }),
  };
}

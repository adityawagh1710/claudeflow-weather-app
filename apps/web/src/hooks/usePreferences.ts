"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  TempUnit,
  WindUnit,
  TimeFormat,
  Theme,
} from "@/lib/types";

export type Preferences = {
  tempUnit: TempUnit;
  windUnit: WindUnit;
  timeFormat: TimeFormat;
  theme: Theme;
};

const STORAGE_KEY = "weather-prefs";

const DEFAULTS: Preferences = {
  tempUnit: "celsius",
  windUnit: "kmh",
  timeFormat: "24h",
  theme: "system",
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
    setPrefs(readStored());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
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
  };
}

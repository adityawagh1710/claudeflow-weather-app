"use client";

import type { usePreferences } from "@/hooks/usePreferences";
import { track } from "@/lib/analytics";

type PrefsApi = ReturnType<typeof usePreferences>;

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pref-group" role="group" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className="pref-btn"
          data-testid={`pref-${opt.value}`}
          aria-pressed={value === opt.value}
          aria-label={`${label}: ${opt.label}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PreferencesBar({ api }: { api: PrefsApi }) {
  const {
    prefs,
    setTempUnit,
    setWindUnit,
    setTimeFormat,
    setTheme,
    setAnalyticsOptIn,
  } = api;
  return (
    <div className="prefs" data-testid="preferences-bar">
      <Toggle
        label="Temperature unit"
        value={prefs.tempUnit}
        onChange={(v) => {
          setTempUnit(v);
          track("unit_toggled", { unit: "temp", value: v });
        }}
        options={[
          { value: "celsius", label: "°C" },
          { value: "fahrenheit", label: "°F" },
        ]}
      />
      <Toggle
        label="Wind unit"
        value={prefs.windUnit}
        onChange={(v) => {
          setWindUnit(v);
          track("unit_toggled", { unit: "wind", value: v });
        }}
        options={[
          { value: "kmh", label: "km/h" },
          { value: "mph", label: "mph" },
        ]}
      />
      <Toggle
        label="Time format"
        value={prefs.timeFormat}
        onChange={(v) => {
          setTimeFormat(v);
          track("unit_toggled", { unit: "time", value: v });
        }}
        options={[
          { value: "24h", label: "24h" },
          { value: "12h", label: "12h" },
        ]}
      />
      <Toggle
        label="Theme"
        value={prefs.theme}
        onChange={(v) => {
          setTheme(v);
          track("theme_changed", { theme: v });
        }}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "Auto" },
        ]}
      />
      <div className="pref-group" role="group" aria-label="Analytics">
        <button
          type="button"
          className="pref-btn"
          data-testid="pref-analytics"
          aria-pressed={prefs.analyticsOptIn}
          aria-label={`Anonymous usage analytics: ${
            prefs.analyticsOptIn ? "on" : "off"
          }`}
          onClick={() => setAnalyticsOptIn(!prefs.analyticsOptIn)}
        >
          Analytics {prefs.analyticsOptIn ? "On" : "Off"}
        </button>
      </div>
    </div>
  );
}

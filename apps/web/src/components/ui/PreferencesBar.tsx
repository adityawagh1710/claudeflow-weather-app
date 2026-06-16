"use client";

import type { usePreferences } from "@/hooks/usePreferences";

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
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PreferencesBar({ api }: { api: PrefsApi }) {
  const { prefs, setTempUnit, setWindUnit, setTimeFormat, setTheme } = api;
  return (
    <div className="prefs">
      <Toggle
        label="Temperature unit"
        value={prefs.tempUnit}
        onChange={setTempUnit}
        options={[
          { value: "celsius", label: "°C" },
          { value: "fahrenheit", label: "°F" },
        ]}
      />
      <Toggle
        label="Wind unit"
        value={prefs.windUnit}
        onChange={setWindUnit}
        options={[
          { value: "kmh", label: "km/h" },
          { value: "mph", label: "mph" },
        ]}
      />
      <Toggle
        label="Time format"
        value={prefs.timeFormat}
        onChange={setTimeFormat}
        options={[
          { value: "24h", label: "24h" },
          { value: "12h", label: "12h" },
        ]}
      />
      <Toggle
        label="Theme"
        value={prefs.theme}
        onChange={setTheme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
          { value: "system", label: "Auto" },
        ]}
      />
    </div>
  );
}

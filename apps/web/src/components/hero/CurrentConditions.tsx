"use client";

import type { WeatherSnapshot } from "@/lib/types";
import type { Preferences } from "@/hooks/usePreferences";
import { wmoIcon, wmoLabel } from "@/lib/wmo";
import { formatTemp, formatWind, degToCompass, formatTime } from "@/lib/units";

export function CurrentConditions({
  snapshot,
  prefs,
}: {
  snapshot: WeatherSnapshot;
  prefs: Preferences;
}) {
  const { current, location } = snapshot;

  return (
    <section className="glass card hero" aria-labelledby="current-heading">
      <div className="hero-main">
        <span className="hero-icon" aria-hidden="true">
          {wmoIcon(current.weatherCode)}
        </span>
        <div>
          <h2 id="current-heading" className="app-title">
            {location.name}
          </h2>
          <div className="hero-temp">
            {formatTemp(current.temperature, prefs.tempUnit)}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {wmoLabel(current.weatherCode)} · feels like{" "}
            {formatTemp(current.apparentTemperature, prefs.tempUnit)}
          </p>
        </div>
      </div>

      <div className="hero-meta">
        <div className="meta-item">
          <span className="meta-label">Humidity</span>
          <span className="meta-value">{Math.round(current.humidity)}%</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Wind</span>
          <span className="meta-value">
            {formatWind(current.windSpeed, prefs.windUnit)}{" "}
            {degToCompass(current.windDirection)}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Daylight</span>
          <span className="meta-value">{current.isDay ? "Day" : "Night"}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Observed</span>
          <span className="meta-value">
            {formatTime(current.observedAt, prefs.timeFormat)}
          </span>
        </div>
      </div>
    </section>
  );
}

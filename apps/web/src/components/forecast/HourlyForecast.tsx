"use client";

import type { WeatherSnapshot } from "@/lib/types";
import type { Preferences } from "@/hooks/usePreferences";
import { wmoIcon } from "@/lib/wmo";
import { formatTemp, formatTime } from "@/lib/units";

export function HourlyForecast({
  hourly,
  prefs,
}: {
  hourly: WeatherSnapshot["hourly"];
  prefs: Preferences;
}) {
  if (hourly.length === 0) {
    return null;
  }
  return (
    <section className="glass card" aria-labelledby="hourly-heading">
      <h3 id="hourly-heading" className="section-title">
        Next 24 hours
      </h3>
      <div className="hourly-scroll">
        {hourly.map((h) => (
          <div className="hourly-item" key={h.time}>
            <div className="muted">{formatTime(h.time, prefs.timeFormat)}</div>
            <div className="hourly-icon" aria-hidden="true">
              {wmoIcon(h.weatherCode)}
            </div>
            <div className="meta-value">
              {formatTemp(h.temperature, prefs.tempUnit)}
            </div>
            <div className="muted">💧 {Math.round(h.precipProbability)}%</div>
          </div>
        ))}
      </div>
    </section>
  );
}

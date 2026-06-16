"use client";

import type { WeatherSnapshot } from "@/lib/types";
import type { Preferences } from "@/hooks/usePreferences";
import { wmoIcon, wmoLabel } from "@/lib/wmo";
import { formatTemp, formatDay, formatTime } from "@/lib/units";

export function DailyForecast({
  daily,
  prefs,
}: {
  daily: WeatherSnapshot["daily"];
  prefs: Preferences;
}) {
  if (daily.length === 0) {
    return null;
  }
  return (
    <section className="glass card" aria-labelledby="daily-heading">
      <h3 id="daily-heading" className="section-title">
        7-day forecast
      </h3>
      <div className="daily-list">
        {daily.map((d) => (
          <div className="daily-row" key={d.date}>
            <span className="meta-value">{formatDay(d.date)}</span>
            <span
              className="hourly-icon"
              aria-label={wmoLabel(d.weatherCode)}
              title={wmoLabel(d.weatherCode)}
            >
              {wmoIcon(d.weatherCode)}
            </span>
            <span className="daily-sun">
              ☀ {formatTime(d.sunrise, prefs.timeFormat)} · 🌙{" "}
              {formatTime(d.sunset, prefs.timeFormat)} · UV{" "}
              {Math.round(d.uvIndexMax)}
            </span>
            <span className="meta-value">
              {formatTemp(d.tempMax, prefs.tempUnit)}
              <span className="muted">
                {" "}
                / {formatTemp(d.tempMin, prefs.tempUnit)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

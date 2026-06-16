"use client";

import type { WeatherSnapshot } from "@/lib/types";
import type { Preferences } from "@/hooks/usePreferences";
import { wmoLabel } from "@/lib/wmo";
import { formatTemp, formatDay, formatTime } from "@/lib/units";
import { WeatherIcon } from "@/components/ui/WeatherIcon";

/** Map a temperature (°C) to a cold→warm hue for the range bar. */
function tempHue(c: number): number {
  // Clamp roughly -10..40°C onto blue(250) → red(25).
  const t = Math.max(0, Math.min(1, (c + 10) / 50));
  return 250 - t * 225;
}

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

  const allMin = Math.min(...daily.map((d) => d.tempMin));
  const allMax = Math.max(...daily.map((d) => d.tempMax));
  const span = allMax - allMin || 1;

  return (
    <section className="glass card" aria-labelledby="daily-heading">
      <h3 id="daily-heading" className="section-title">
        7-day forecast
      </h3>
      <div className="daily-list">
        {daily.map((d) => {
          const left = ((d.tempMin - allMin) / span) * 100;
          const widthPct = ((d.tempMax - d.tempMin) / span) * 100;
          return (
            <div className="daily-row" key={d.date}>
              <span className="meta-value daily-day">{formatDay(d.date)}</span>
              <WeatherIcon
                code={d.weatherCode}
                size={34}
                className="daily-glyph"
              />
              <span className="daily-sun">
                ☀ {formatTime(d.sunrise, prefs.timeFormat)} · 🌙{" "}
                {formatTime(d.sunset, prefs.timeFormat)} · UV{" "}
                {Math.round(d.uvIndexMax)}
              </span>
              <span className="daily-temps">
                <span className="daily-lo muted">
                  {formatTemp(d.tempMin, prefs.tempUnit)}
                </span>
                <span
                  className="range-track"
                  role="img"
                  aria-label={`Low ${formatTemp(
                    d.tempMin,
                    prefs.tempUnit,
                  )}, high ${formatTemp(d.tempMax, prefs.tempUnit)}`}
                >
                  <span
                    className="range-fill"
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(widthPct, 6)}%`,
                      background: `linear-gradient(90deg, oklch(70% 0.14 ${tempHue(
                        d.tempMin,
                      )}), oklch(72% 0.16 ${tempHue(d.tempMax)}))`,
                    }}
                  />
                </span>
                <span className="daily-hi meta-value">
                  {formatTemp(d.tempMax, prefs.tempUnit)}
                </span>
              </span>
              <span className="visually-hidden">
                {wmoLabel(d.weatherCode)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import type { WeatherSnapshot } from "@/lib/types";
import type { Preferences } from "@/hooks/usePreferences";
import { formatTemp, formatTime } from "@/lib/units";
import { WeatherIcon } from "@/components/ui/WeatherIcon";

/** Build a smooth-ish SVG polyline path for the temperature curve. */
function buildSparkline(temps: number[], width: number, height: number): string {
  if (temps.length < 2) {
    return "";
  }
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = max - min || 1;
  const pad = 6;
  const stepX = (width - pad * 2) / (temps.length - 1);
  return temps
    .map((t, i) => {
      const x = pad + i * stepX;
      const y = pad + (height - pad * 2) * (1 - (t - min) / span);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

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

  const width = Math.max(hourly.length * 80, 160);
  const height = 56;
  const temps = hourly.map((h) => h.temperature);
  const path = buildSparkline(temps, width, height);

  return (
    <section className="glass card" aria-labelledby="hourly-heading">
      <h3 id="hourly-heading" className="section-title">
        Next 24 hours
      </h3>
      <div className="hourly-scroll">
        <div className="hourly-track">
          {path && (
            <svg
              className="hourly-spark"
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(72% 0.16 40)" />
                  <stop offset="100%" stopColor="oklch(70% 0.14 240)" />
                </linearGradient>
              </defs>
              <path
                className="hourly-spark-line"
                d={path}
                fill="none"
                stroke="url(#sparkGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <div className="hourly-row">
            {hourly.map((h) => (
              <div className="hourly-item" key={h.time}>
                <div className="muted hourly-time">
                  {formatTime(h.time, prefs.timeFormat)}
                </div>
                <WeatherIcon
                  code={h.weatherCode}
                  size={36}
                  className="hourly-glyph"
                />
                <div className="meta-value">
                  {formatTemp(h.temperature, prefs.tempUnit)}
                </div>
                <div
                  className="precip-bar"
                  role="img"
                  aria-label={`Precipitation ${Math.round(
                    h.precipProbability,
                  )} percent`}
                  title={`${Math.round(h.precipProbability)}% precipitation`}
                >
                  <span
                    className="precip-fill"
                    style={{
                      ["--precip" as string]: `${Math.round(
                        h.precipProbability,
                      )}%`,
                    }}
                  />
                  <span className="precip-label muted">
                    {Math.round(h.precipProbability)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import type { WeatherSnapshot } from "@/lib/types";

/** Color for an AQI value on the Good→Hazardous scale (US EPA bands). */
function aqiColor(aqi: number): string {
  if (aqi <= 50) return "oklch(72% 0.17 145)"; // Good - green
  if (aqi <= 100) return "oklch(80% 0.15 95)"; // Moderate - yellow
  if (aqi <= 150) return "oklch(72% 0.16 55)"; // USG - orange
  if (aqi <= 200) return "oklch(62% 0.2 25)"; // Unhealthy - red
  if (aqi <= 300) return "oklch(50% 0.18 320)"; // Very unhealthy - purple
  return "oklch(40% 0.14 20)"; // Hazardous - maroon
}

export function AirQuality({
  airQuality,
}: {
  airQuality: WeatherSnapshot["airQuality"];
}) {
  if (!airQuality) {
    return null;
  }

  const aqi = Math.round(airQuality.aqi);
  // Gauge sweeps 0..300+ over a 270° arc.
  const fraction = Math.max(0, Math.min(1, aqi / 300));
  const color = aqiColor(aqi);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75; // 270° visible arc
  const dash = arc * fraction;

  return (
    <section className="glass card" aria-labelledby="aqi-heading">
      <h3 id="aqi-heading" className="section-title">
        Air quality
      </h3>
      <div className="hero-main">
        <div
          className="aqi-gauge"
          role="img"
          aria-label={`Air quality index ${aqi}, ${airQuality.category}`}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            <circle
              className="aqi-gauge-track"
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${circumference}`}
              transform="rotate(135 60 60)"
            />
            <circle
              className="aqi-gauge-value"
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              transform="rotate(135 60 60)"
            />
          </svg>
          <div className="aqi-gauge-center">
            <span className="aqi-value">{aqi}</span>
            <span className="badge">
              <span
                className="aqi-dot"
                style={{ background: color }}
                aria-hidden="true"
              />
              {airQuality.category}
            </span>
          </div>
        </div>
        <div className="hero-meta">
          {airQuality.pm25 !== undefined && (
            <div className="meta-item">
              <span className="meta-label">PM2.5</span>
              <span className="meta-value">
                {airQuality.pm25.toFixed(1)} µg/m³
              </span>
            </div>
          )}
          {airQuality.pm10 !== undefined && (
            <div className="meta-item">
              <span className="meta-label">PM10</span>
              <span className="meta-value">
                {airQuality.pm10.toFixed(1)} µg/m³
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

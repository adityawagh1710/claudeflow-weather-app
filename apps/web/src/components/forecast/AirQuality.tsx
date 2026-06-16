"use client";

import type { WeatherSnapshot } from "@/lib/types";

export function AirQuality({
  airQuality,
}: {
  airQuality: WeatherSnapshot["airQuality"];
}) {
  if (!airQuality) {
    return null;
  }
  return (
    <section className="glass card" aria-labelledby="aqi-heading">
      <h3 id="aqi-heading" className="section-title">
        Air quality
      </h3>
      <div className="hero-main">
        <div>
          <div className="aqi-value">{Math.round(airQuality.aqi)}</div>
          <span className="badge">{airQuality.category}</span>
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

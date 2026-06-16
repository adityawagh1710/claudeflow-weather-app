"use client";

/**
 * Animated, theme-aware weather glyphs rendered as inline SVG.
 *
 * Motion is purely CSS (transform/opacity) and lives in globals.css under the
 * `.wx-*` classes, so it is automatically curtailed by `prefers-reduced-motion`.
 * The SVG itself is decorative (`aria-hidden`); callers must supply a readable
 * text alternative nearby (label/title) — every existing call site does.
 */

import { conditionFamily } from "@/lib/weatherCondition";

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  /** Size in px; the SVG scales to this square box. */
  size?: number;
  className?: string;
}

const SUN = "oklch(82% 0.16 85)";
const SUN_CORE = "oklch(88% 0.17 90)";
const MOON = "oklch(90% 0.04 250)";
const CLOUD = "oklch(90% 0.02 250)";
const CLOUD_DARK = "oklch(70% 0.03 255)";
const RAIN = "oklch(70% 0.13 240)";
const SNOW = "oklch(96% 0.01 240)";
const BOLT = "oklch(85% 0.18 90)";

function Sun() {
  return (
    <g className="wx-sun">
      <circle cx="32" cy="32" r="12" fill={SUN_CORE} />
      <g className="wx-sun-rays" stroke={SUN} strokeWidth="3" strokeLinecap="round">
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const x = 32 + Math.cos(a);
          const y = 32 + Math.sin(a);
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * 16}
              y1={y + Math.sin(a) * 16}
              x2={x + Math.cos(a) * 23}
              y2={y + Math.sin(a) * 23}
            />
          );
        })}
      </g>
    </g>
  );
}

function Moon() {
  return (
    <g className="wx-moon">
      <path
        d="M40 18a16 16 0 1 0 6 22 13 13 0 0 1-6-22z"
        fill={MOON}
      />
      <circle cx="46" cy="22" r="1.6" fill={MOON} opacity="0.7" />
      <circle cx="50" cy="30" r="1.1" fill={MOON} opacity="0.5" />
    </g>
  );
}

function Cloud({ fill = CLOUD, className = "" }: { fill?: string; className?: string }) {
  return (
    <g className={className}>
      <path
        d="M20 42a10 10 0 0 1 1-19 13 13 0 0 1 24 3 8 8 0 0 1-1 16z"
        fill={fill}
      />
    </g>
  );
}

function Drops({ color = RAIN }: { color?: string }) {
  return (
    <g className="wx-rain" stroke={color} strokeWidth="3" strokeLinecap="round">
      <line x1="24" y1="48" x2="22" y2="56" className="wx-drop wx-drop-1" />
      <line x1="34" y1="48" x2="32" y2="58" className="wx-drop wx-drop-2" />
      <line x1="44" y1="48" x2="42" y2="56" className="wx-drop wx-drop-3" />
    </g>
  );
}

function Flakes() {
  return (
    <g className="wx-snow" fill={SNOW}>
      <circle cx="24" cy="52" r="2.4" className="wx-flake wx-flake-1" />
      <circle cx="34" cy="54" r="2.4" className="wx-flake wx-flake-2" />
      <circle cx="44" cy="52" r="2.4" className="wx-flake wx-flake-3" />
    </g>
  );
}

export function WeatherIcon({ code, isDay = true, size = 64, className }: WeatherIconProps) {
  const family = conditionFamily(code);

  const body = (() => {
    switch (family) {
      case "clear":
        return isDay ? <Sun /> : <Moon />;
      case "cloudy":
        return (
          <>
            {isDay ? (
              <g transform="translate(6 -6) scale(0.7)">
                <Sun />
              </g>
            ) : null}
            <Cloud className="wx-cloud" />
          </>
        );
      case "fog":
        return (
          <>
            <Cloud fill={CLOUD_DARK} className="wx-cloud" />
            <g className="wx-fog" stroke={CLOUD} strokeWidth="3" strokeLinecap="round">
              <line x1="16" y1="50" x2="48" y2="50" className="wx-fog-1" />
              <line x1="14" y1="56" x2="46" y2="56" className="wx-fog-2" />
            </g>
          </>
        );
      case "rain":
        return (
          <>
            <Cloud className="wx-cloud" />
            <Drops />
          </>
        );
      case "snow":
        return (
          <>
            <Cloud className="wx-cloud" />
            <Flakes />
          </>
        );
      case "thunder":
        return (
          <>
            <Cloud fill={CLOUD_DARK} className="wx-cloud" />
            <path
              d="M32 46l-8 12h6l-4 10 12-15h-7l5-7z"
              fill={BOLT}
              className="wx-bolt"
            />
          </>
        );
    }
  })();

  return (
    <svg
      className={`wx-icon${className ? ` ${className}` : ""}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      {body}
    </svg>
  );
}

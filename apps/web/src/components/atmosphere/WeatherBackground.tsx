"use client";

/**
 * Fixed, full-viewport atmosphere layer behind all content. The gradient and
 * particle set are driven by the active weather condition + day/night, and the
 * layer crossfades smoothly when the scene changes.
 *
 * Entirely decorative: the root is `aria-hidden` and never focusable. All
 * motion is CSS transform/opacity only (see `.sky*` rules in globals.css) and
 * is disabled under `prefers-reduced-motion: reduce`. Particle counts are kept
 * modest for performance.
 */

import { useEffect, useState } from "react";
import { sceneKey, type SceneKey } from "@/lib/weatherCondition";

interface WeatherBackgroundProps {
  /** WMO code of the active snapshot, or null before data loads. */
  code: number | null;
  isDay: boolean;
}

const STAR_COUNT = 36;
const RAIN_STREAKS = 28;
const SNOW_FLAKES = 26;
const CLOUD_SHAPES = 4;

function Stars() {
  return (
    <div className="sky-stars" aria-hidden="true">
      {Array.from({ length: STAR_COUNT }).map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37) % 80;
        const delay = (i % 7) * 0.6;
        const size = 1 + (i % 3) * 0.6;
        return (
          <span
            key={i}
            className="sky-star"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function Clouds() {
  return (
    <div className="sky-clouds" aria-hidden="true">
      {Array.from({ length: CLOUD_SHAPES }).map((_, i) => (
        <span
          key={i}
          className="sky-cloud"
          style={{
            top: `${8 + i * 18}%`,
            transform: `scale(${0.8 + (i % 3) * 0.35})`,
            animationDuration: `${48 + i * 14}s`,
            animationDelay: `${-i * 9}s`,
            opacity: 0.5 - i * 0.06,
          }}
        />
      ))}
    </div>
  );
}

function Rain() {
  return (
    <div className="sky-rain" aria-hidden="true">
      {Array.from({ length: RAIN_STREAKS }).map((_, i) => (
        <span
          key={i}
          className="sky-streak"
          style={{
            left: `${(i * 100) / RAIN_STREAKS}%`,
            animationDuration: `${0.55 + (i % 5) * 0.12}s`,
            animationDelay: `${(i % 9) * 0.13}s`,
          }}
        />
      ))}
    </div>
  );
}

function Snow() {
  return (
    <div className="sky-snow" aria-hidden="true">
      {Array.from({ length: SNOW_FLAKES }).map((_, i) => (
        <span
          key={i}
          className="sky-flake"
          style={{
            left: `${(i * 100) / SNOW_FLAKES}%`,
            animationDuration: `${6 + (i % 6)}s`,
            animationDelay: `${(i % 11) * 0.7}s`,
            ["--drift" as string]: `${(i % 5) - 2}vw`,
          }}
        />
      ))}
    </div>
  );
}

function SceneFx({ scene }: { scene: SceneKey }) {
  switch (scene) {
    case "clear-day":
      return <div className="sky-sun" aria-hidden="true" />;
    case "clear-night":
      return <Stars />;
    case "cloudy":
      return <Clouds />;
    case "fog":
      return <div className="sky-haze" aria-hidden="true" />;
    case "rain":
      return (
        <>
          <Clouds />
          <Rain />
        </>
      );
    case "snow":
      return (
        <>
          <Clouds />
          <Snow />
        </>
      );
    case "thunder":
      return (
        <>
          <Clouds />
          <Rain />
          <div className="sky-flash" aria-hidden="true" />
        </>
      );
    default:
      return null;
  }
}

export function WeatherBackground({ code, isDay }: WeatherBackgroundProps) {
  const target: SceneKey = code === null ? "neutral" : sceneKey(code, isDay);

  // Keep the previous scene mounted briefly so layers crossfade rather than pop.
  const [scenes, setScenes] = useState<SceneKey[]>([target]);

  useEffect(() => {
    setScenes((prev) => {
      if (prev[prev.length - 1] === target) {
        return prev;
      }
      return [...prev.slice(-1), target];
    });
    if (scenes[scenes.length - 1] === target) {
      return undefined;
    }
    const id = window.setTimeout(() => setScenes([target]), 1200);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div className="sky" aria-hidden="true" data-scene={target}>
      {scenes.map((scene, i) => {
        const isTop = i === scenes.length - 1;
        return (
          <div
            key={`${scene}-${i}`}
            className={`sky-scene${isTop ? " sky-scene-active" : ""}`}
            data-scene={scene}
          >
            <SceneFx scene={scene} />
          </div>
        );
      })}
    </div>
  );
}

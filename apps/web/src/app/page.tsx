"use client";

import { useCallback, useState } from "react";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { PreferencesBar } from "@/components/ui/PreferencesBar";
import {
  LocationSearch,
  type ActiveLocation,
} from "@/components/search/LocationSearch";
import { CurrentConditions } from "@/components/hero/CurrentConditions";
import { HourlyForecast } from "@/components/forecast/HourlyForecast";
import { DailyForecast } from "@/components/forecast/DailyForecast";
import { AirQuality } from "@/components/forecast/AirQuality";
import { usePreferences } from "@/hooks/usePreferences";
import { useWeather } from "@/hooks/useWeather";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { FavoritesPanel } from "@/components/favorites/FavoritesPanel";
import { WeatherBackground } from "@/components/atmosphere/WeatherBackground";

function Dashboard() {
  const prefsApi = usePreferences();
  const auth = useAuth();
  const favorites = useFavorites(auth.accessToken);
  const [active, setActive] = useState<ActiveLocation | null>(null);

  const onSelect = useCallback((loc: ActiveLocation) => {
    setActive(loc);
  }, []);

  const { data, isLoading, isError, error } = useWeather(
    active?.latitude ?? null,
    active?.longitude ?? null,
    active?.name,
  );

  return (
    <>
      <ThemeProvider theme={prefsApi.prefs.theme} />
      <WeatherBackground
        code={data ? data.current.weatherCode : null}
        isDay={data ? data.current.isDay : true}
      />
      <div className="shell">
        <header className="app-header">
          <div>
            <h1 className="app-title">Weather</h1>
            <p className="muted" style={{ margin: 0 }}>
              Open-Meteo · no account needed
            </p>
          </div>
          <PreferencesBar api={prefsApi} />
        </header>

        <main className="content" aria-busy={active !== null && isLoading}>
          <LocationSearch onSelect={onSelect} bootstrap={active === null} />

          <AuthPanel auth={auth} />
          <FavoritesPanel api={favorites} active={active} onSelect={onSelect} />

          {!active && (
            <div className="glass status" role="status">
              Detecting your location…
            </div>
          )}
          {active && isLoading && (
            <div className="glass status" role="status">
              Loading weather for {active.name}…
            </div>
          )}
          {active && isError && (
            <div className="glass status" role="alert">
              {error instanceof Error
                ? error.message
                : "Failed to load weather"}
            </div>
          )}

          {data && (
            <>
              <div className="enter" style={{ ["--enter-delay" as string]: "0ms" }}>
                <CurrentConditions snapshot={data} prefs={prefsApi.prefs} />
              </div>
              <div className="enter" style={{ ["--enter-delay" as string]: "80ms" }}>
                <HourlyForecast hourly={data.hourly} prefs={prefsApi.prefs} />
              </div>
              <div className="enter" style={{ ["--enter-delay" as string]: "160ms" }}>
                <DailyForecast daily={data.daily} prefs={prefsApi.prefs} />
              </div>
              <div className="enter" style={{ ["--enter-delay" as string]: "240ms" }}>
                <AirQuality airQuality={data.airQuality} />
              </div>
            </>
          )}
        </main>

        <footer className="app-footer muted">
          <p style={{ margin: 0 }}>
            Weather data by Open-Meteo. No account or API key required.
          </p>
        </footer>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <QueryProvider>
      <Dashboard />
    </QueryProvider>
  );
}

# Weather App — Technical Specification

**Slug:** build-weather-app
**Author:** Claude Code
**Date:** 2026-06-16
**Status:** Draft
**Branch:** preflight/build-weather-app
**Source brainstorm:** [`01-brainstorm.md`](./01-brainstorm.md)

---

## 1) Overview

Build a cross-platform **desktop Weather App** that lets a signed-in user search
locations, view current conditions plus an hourly and 7-day forecast, see air-quality
and sun data, manage a set of saved locations, and toggle measurement units — with
preferences and favorites synced across their devices.

The desktop client is a **Tauri** shell wrapping a statically-exported **Next.js** UI.
All account, sync, and weather-proxy logic lives in a **remotely hosted Next.js API**.
Weather data comes from **Open-Meteo** (keyless), accessed through a single
normalization layer. Accounts and synced data are stored in **Supabase** (Auth +
Postgres). The app remains usable offline via an on-device cache that reconciles with
the backend when connectivity returns.

### Goals
- A polished, glassmorphic desktop weather experience (light + dark).
- Reliable current + hourly + 7-day forecast and air-quality data for any searched city.
- Account-based favorites and preferences that sync across devices.
- Graceful offline behavior using cached data.

### Non-Goals (v1)
- Running our own weather models or data ingestion.
- Push notifications / severe-weather alerting.
- Web/mobile-store distribution (desktop only this round).
- Monetization, ads, paid tiers.
- Team/shared accounts or social features.

---

## 2) Architecture

```
┌──────────────────────────────────────────────┐
│  Tauri Desktop Shell (Rust)                    │
│  ┌──────────────────────────────────────────┐ │
│  │  Next.js UI (static export, in webview)    │ │
│  │  - React components (glassmorphism)        │ │
│  │  - TanStack Query (cache + SWR)            │ │
│  │  - Local cache store (favorites/last data) │ │
│  └──────────────────────────────────────────┘ │
└───────────────┬────────────────────────────────┘
                │ HTTPS
                ▼
┌──────────────────────────────────────────────┐
│  Remote Next.js API (Vercel/Fly/Railway)       │
│  - /api/weather   → proxies Open-Meteo         │
│  - /api/geocode   → proxies Open-Meteo geocode │
│  - /api/favorites → CRUD, Supabase-backed      │
│  - /api/prefs     → user preferences           │
│  - Auth middleware (Supabase JWT verify)       │
│  weatherClient normalization layer             │
└───────┬─────────────────────────┬──────────────┘
        │                         │
        ▼                         ▼
┌──────────────┐         ┌────────────────────────┐
│  Open-Meteo  │         │  Supabase               │
│  (keyless)   │         │  - Auth (OAuth/email)   │
│  forecast/   │         │  - Postgres (RLS)       │
│  geocode/AQI │         │    profiles, favorites, │
└──────────────┘         │    preferences          │
                         └────────────────────────┘
```

### Key decisions (from brainstorm §6)
| Concern | Decision |
|---------|----------|
| Platform | Desktop (Tauri shell) |
| UI framework | Next.js (static export in webview) |
| Backend | Remotely hosted Next.js API over HTTPS |
| Weather data | Open-Meteo (keyless) via `weatherClient` |
| Auth | Supabase Auth (loopback/deep-link OAuth) |
| Database | Supabase Postgres (RLS, cross-device sync) |
| Offline | Local cache + background sync |
| Initial location | IP-based lookup, then manual search |
| Design | Glassmorphism, light + dark |
| Features | Search, hourly + 7-day, unit toggle, favorites, AQI/UV/sun |

> **Note on Next.js static export:** A statically-exported Next.js bundle cannot serve
> its own API routes. Therefore the desktop client ships **UI only**; all `/api/*`
> routes run on the separately deployed Next.js server. The client targets that server
> via a configured base URL (`NEXT_PUBLIC_API_BASE_URL`).

---

## 3) Data Model (Supabase Postgres)

All user-owned tables are protected by Row-Level Security keyed on `auth.uid()`.

```sql
-- profiles: 1:1 with auth.users
profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text,
  created_at    timestamptz not null default now()
)

-- preferences: per-user settings
preferences (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  temp_unit      text not null default 'celsius'  check (temp_unit in ('celsius','fahrenheit')),
  wind_unit      text not null default 'kmh'      check (wind_unit in ('kmh','mph')),
  time_format    text not null default '24h'      check (time_format in ('12h','24h')),
  theme          text not null default 'system'   check (theme in ('light','dark','system')),
  updated_at     timestamptz not null default now()
)

-- favorites: saved locations, ordered
favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,        -- "London, GB"
  latitude    double precision not null,
  longitude   double precision not null,
  country     text,
  admin1      text,                 -- region/state
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, latitude, longitude)
)
```

RLS policies: each table allows `select/insert/update/delete` only where
`user_id = auth.uid()` (or `id = auth.uid()` for `profiles`).

### Local cache (on-device, Tauri store)
- `last_weather:{lat},{lon}` → normalized weather payload + `fetched_at`.
- `favorites_cache` → last-synced favorites list.
- `preferences_cache` → last-synced preferences.
- `pending_mutations` → queue of favorite/preference writes made while offline.

---

## 4) Internal Weather Model (normalization target)

`weatherClient` converts Open-Meteo responses into this stable shape so UI/storage
never depend on provider JSON:

```ts
type WeatherSnapshot = {
  location: { name: string; latitude: number; longitude: number; timezone: string };
  current: {
    temperature: number;        // always stored in °C; converted at render
    apparentTemperature: number;
    weatherCode: number;        // WMO code → icon/label mapping
    humidity: number;           // %
    windSpeed: number;          // always km/h; converted at render
    windDirection: number;      // degrees
    isDay: boolean;
    observedAt: string;         // ISO
  };
  hourly: Array<{ time: string; temperature: number; weatherCode: number; precipProbability: number }>;
  daily: Array<{ date: string; tempMin: number; tempMax: number; weatherCode: number; sunrise: string; sunset: string; uvIndexMax: number }>;
  airQuality: { aqi: number; category: string; pm25?: number; pm10?: number } | null;
  fetchedAt: string;            // ISO, for cache staleness
};
```

Canonical storage units are metric (°C, km/h, 24h). Unit conversion is a pure
render-time concern driven by `preferences`.

---

## 5) API Surface (remote Next.js)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/geocode?q=` | GET | optional | Proxy Open-Meteo geocoding; returns candidate locations |
| `/api/weather?lat=&lon=` | GET | optional | Proxy + normalize forecast + AQI into `WeatherSnapshot` |
| `/api/iplocation` | GET | optional | Resolve approximate location from request IP (first-launch bootstrap) |
| `/api/favorites` | GET/POST | required | List / create favorites |
| `/api/favorites/:id` | PATCH/DELETE | required | Reorder / remove favorite |
| `/api/prefs` | GET/PUT | required | Read / upsert preferences |

- All weather/geocode responses are server-cached briefly (e.g. 5–10 min) to respect
  Open-Meteo fair use and speed up repeat requests.
- Auth-required routes verify the Supabase JWT from the `Authorization: Bearer` header.
- All inputs validated at the boundary (lat/lon ranges, query length, enum values) with
  schema validation; clear error envelopes on failure.

---

## 6) Functional Requirements

### FR-1 Authentication
- User can sign up / sign in via Supabase Auth (email + at least one OAuth provider).
- Desktop OAuth uses a loopback or deep-link redirect; session token persisted securely
  in the Tauri store; auto-refresh on expiry.
- Signed-out users may still search and view weather (read-only); favorites/prefs sync
  requires sign-in.

### FR-2 Location search & selection
- User types a city; `/api/geocode` returns ranked candidates (name, region, country).
- Selecting a candidate loads its `WeatherSnapshot`.
- On first launch (no favorites, signed-out or empty), bootstrap via `/api/iplocation`.

### FR-3 Current conditions
- Display temperature, apparent temperature, condition (icon + label from WMO code),
  humidity, wind speed + direction, day/night state, and observation time.

### FR-4 Forecast
- Hourly forecast (next ~24–48h) with temperature, condition, precip probability.
- 7-day forecast with min/max temp, condition, sunrise/sunset, max UV index.

### FR-5 Air quality & sun data
- Show current AQI with category label; UV index and sunrise/sunset per day.

### FR-6 Saved locations (favorites)
- Add the current location to favorites; list, reorder, and remove favorites.
- Favorites persist to Supabase and sync across devices when signed in.
- Quick-switch between favorites loads each one's weather (from cache first, then refresh).

### FR-7 Unit & theme preferences
- Toggle temperature (°C/°F), wind (km·h/mph), time format (12h/24h), theme
  (light/dark/system). Persisted to `preferences` and applied at render.

### FR-8 Offline behavior
- On launch without connectivity, render last-cached weather, favorites, and prefs.
- Mutations made offline queue in `pending_mutations` and replay on reconnect.
- Stale data is visibly labeled with its `fetchedAt` timestamp.

---

## 7) Non-Functional Requirements

- **Performance:** First meaningful render < 1.5s on cached data; weather fetch
  perceived-instant via cache-then-revalidate. Respect web CWV-style budgets for the
  in-webview UI.
- **Security:** No secrets in the client bundle; Supabase service role key only on the
  server. RLS enforced on all user tables. All inputs validated at API boundary. HTTPS
  only. Session tokens stored via OS-secure storage where available.
- **Accessibility:** Keyboard navigable, sufficient contrast in both themes, respects
  reduced-motion (glassmorphism/animation degrade gracefully).
- **Reliability:** Open-Meteo failures surface user-friendly errors and fall back to
  cached data; never crash on provider outage.
- **Maintainability:** Provider isolated behind `weatherClient`; files < 800 lines;
  immutable data patterns; feature-based module organization.
- **Testing:** ≥ 80% coverage. Unit tests for `weatherClient` normalization + unit
  conversion; integration tests for API routes (mocked Open-Meteo + Supabase); E2E for
  search → view → favorite → unit-toggle → offline-relaunch flows.

---

## 8) Project Structure (proposed)

```
weather-app/
├── apps/
│   ├── desktop/            # Tauri shell (Rust) + build config
│   └── web/                # Next.js (UI static export + API routes)
│       ├── src/
│       │   ├── app/        # routes + /api/*
│       │   ├── components/ # hero/, forecast/, search/, favorites/, ui/
│       │   ├── hooks/      # useWeather, usePreferences, useReducedMotion
│       │   ├── lib/        # weatherClient, supabase, units, cache, validation
│       │   └── styles/     # tokens.css, glass.css, themes
├── supabase/               # migrations + RLS policies
└── doc/specs/build-weather-app/
```

---

## 9) Acceptance Criteria

- [ ] A signed-out user can search a city and see current + hourly + 7-day + AQI.
- [ ] First launch with no input auto-detects approximate location via IP.
- [ ] A user can sign in (email + OAuth) from the desktop app and stay signed in across relaunches.
- [ ] A signed-in user can add, reorder, and remove favorites; changes appear on a second device.
- [ ] Unit and theme toggles change rendering immediately and persist across relaunches.
- [ ] Relaunching offline shows last-cached weather/favorites/prefs with a staleness indicator.
- [ ] A favorite added offline syncs to the backend after reconnect.
- [ ] No secrets present in the shipped desktop bundle; RLS verified to block cross-user access.
- [ ] Both light and dark themes render intentionally (not template-default) and pass contrast checks.
- [ ] Test suite passes with ≥ 80% coverage across unit/integration/E2E.

---

## 10) Risks & Open Considerations

- **Static-export + API split:** UI and API are separate deploy targets; client must be
  built with the correct API base URL per environment (dev/prod).
- **Desktop OAuth redirect:** Loopback/deep-link flow needs platform testing
  (Windows/macOS/Linux); allowlist redirect URIs in Supabase.
- **Open-Meteo fair use:** Server-side caching and request coalescing required to avoid
  rate issues; commercial use would require revisiting licensing (currently out of scope).
- **Conflict resolution on sync:** Define last-write-wins (by `updated_at`) for prefs and
  per-row reconciliation for favorites when replaying `pending_mutations`.
- **Tauri webview parity:** Glassmorphism (backdrop-filter) support varies by platform
  webview; provide a solid-surface fallback.

---

## 11) Out of Scope (deferred)

- Severe-weather alerts / notifications.
- Weather radar/map tiles.
- Widgets, menu-bar/tray mini-view.
- Localization / i18n beyond units and time format.
- Commercial-tier weather provider migration.

---

## 12) Observability & Analytics

Telemetry must be **privacy-respecting** and never leak secrets or precise personal
location. All collection is opt-in where it concerns usage analytics; operational error
reporting may default-on but must be scrubbed.

### 12.1 Logging (server — remote Next.js API)
- **Structured JSON logs** with a stable schema: `timestamp`, `level`, `requestId`,
  `route`, `method`, `status`, `durationMs`, `cacheHit`, and (when present) a coarse
  `provider` label (`open-meteo` / `ipapi`). No raw query strings containing user input
  beyond a length, no full lat/lon at full precision (round to ~2 dp ≈ city level).
- **Levels:** `debug` (dev only), `info` (request lifecycle), `warn` (degraded:
  provider slow, AQI missing, cache miss storms), `error` (handled failures), `fatal`
  (unhandled). Never log Supabase JWTs, service-role keys, emails, or auth tokens.
- **Request correlation:** generate/propagate a `requestId` (header `x-request-id`)
  from client → API → log lines so a single user action is traceable end-to-end.
- **Provider observability:** log Open-Meteo/ipapi latency, status, and rate-limit
  signals; emit a `warn` when fair-use thresholds are approached (supports §10 risk).

### 12.2 Error tracking
- Integrate an error-tracking SDK (e.g. Sentry-compatible) on **both** the client UI and
  the server API. Capture stack traces, `requestId`, route, and release/version.
- **PII scrubbing is mandatory:** strip emails, tokens, exact coordinates, and IP before
  send. Use a `beforeSend` hook to enforce scrubbing; fail closed (drop event) if
  scrubbing cannot be applied.
- **Source maps** uploaded at build time for readable desktop/web stack traces; not
  shipped in the public bundle.
- Tag events with `appVersion`, `platform` (`web`/`desktop`), and `online`/`offline`
  state so offline-path failures (§6 FR-8) are distinguishable.

### 12.3 Metrics
- **RED metrics** per API route: Rate (req/s), Errors (%), Duration (p50/p95/p99).
- **Cache effectiveness:** hit ratio for weather/geocode (validates §5 caching + §10
  fair-use mitigation).
- **Provider health:** Open-Meteo/ipapi error rate and latency; alert on sustained
  degradation.
- **Sync health (when Supabase lands):** `pending_mutations` replay success/failure
  rate and reconcile-conflict counts (validates §6 FR-8 + §10 conflict resolution).
- **Client web vitals:** report LCP/INP/CLS and "first meaningful render < 1.5s on
  cached data" (§7) as field metrics.

### 12.4 Product analytics (opt-in)
- Track anonymized, aggregate events only: `location_searched` (no query text — count
  only), `favorite_added/removed`, `unit_toggled`, `theme_changed`, `offline_render`.
- **No precise location, no search terms, no user identifiers** beyond an anonymous,
  rotating install id. Honor a clear in-app analytics opt-out that disables product
  events (operational error reporting may remain, still scrubbed).
- Respect Do-Not-Track / platform privacy signals where available.

### 12.5 Acceptance criteria (observability)
- [ ] Every API request emits one structured log line with `requestId` and `durationMs`;
      no secrets/PII/full-precision coordinates appear in any log.
- [ ] Errors on client and server reach the tracker with scrubbing verified (test asserts
      a synthetic email/token/coordinate is removed before send).
- [ ] RED + cache-hit metrics are queryable for each route; a dashboard or export exists.
- [ ] Product analytics are off until opt-in; toggling opt-out stops product events.
- [ ] Web-vitals (LCP/INP/CLS) are reported from the running app.

> **Status note:** Observability is **not implemented** in the current web-core slice
> (Session 1). It is net-new scope; see Changelog 2026-06-16 and the new tasks created by
> re-running `/spec:decompose`.

---

## Changelog

> Datetimes drive incremental `/spec:decompose`. Newest first.

### 2026-06-16 14:30 — Add Observability & Analytics
- **Changes:**
  - Added §12 "Observability & Analytics" (logging, error tracking, metrics, opt-in
    product analytics, and observability acceptance criteria).
- **New requirements:**
  - Structured, PII/secret-free JSON request logging with `requestId` correlation
    (client → API) and provider latency/rate-limit observability.
  - Client + server error tracking with mandatory `beforeSend` PII scrubbing and
    build-time source maps; events tagged with version/platform/online-state.
  - RED metrics per API route, cache-hit ratio, provider health, sync health (when
    Supabase lands), and field web-vitals reporting.
  - Opt-in anonymized product analytics (no location/search-text/user id), with opt-out
    and DNT respect.

### 2026-06-16 00:00 — Initial specification
- **Changes:** Created the full specification (§1–§11) from the brainstorm.
- **New requirements:** All baseline v1 functionality (auth, search, forecast, AQI,
  favorites, preferences, offline sync) — captured by the original `/spec:decompose`.

# Weather App — Web

The web/API layer of the Weather App: a Next.js 15 (App Router) + React 19 +
TypeScript-strict application. It renders current conditions, hourly and 7-day forecasts,
and air quality for any location, with a glassmorphic light/dark UI. Weather data comes
from **Open-Meteo** (keyless — no API key required).

> This is one app in a planned monorepo. A **Tauri desktop shell** and **live Supabase**
> backend are specced but not yet wired up — see the repo root `README.md` and
> `doc/specs/build-weather-app/`.

## Requirements

- Node.js 20+ (developed on Node 24)
- npm

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs fully out of the box — no environment variables needed (Open-Meteo is
keyless, and Supabase/error-tracking are optional and gated off when unset).

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server (`http://localhost:3000`) |
| `npm run build` | Production build (standalone output for Docker) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests + coverage; **enforces ≥80% on `src/lib/**`** |
| `npm run test:e2e` | Playwright E2E (builds + serves, then runs Chromium) |
| `npm run lint` | Placeholder — ESLint is not configured yet |

E2E needs the Chromium browser once: `npx playwright install chromium`.

## Environment variables

All optional. Copy `.env.example` to `.env.local` and fill in only what you need. The app
builds and serves signed-out weather browsing without any of these.

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL (enables auth/sync) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Service-role key — never imported client-side |
| `ERROR_TRACKING_DSN` | server/client | Error-tracking sink; no-op when unset |
| `NEXT_PUBLIC_API_BASE_URL` | public | Remote API base URL (used by the future desktop/static-export build) |

When Supabase env is absent, the auth UI is disabled and favorites/preferences persist to
`localStorage` instead of syncing.

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/weather?lat=&lon=` | — | Normalized current + hourly + 7-day + air quality (Open-Meteo) |
| `GET /api/geocode?q=` | — | City search candidates (Open-Meteo geocoding) |
| `GET /api/iplocation` | — | Approximate location from request IP (first-launch bootstrap) |
| `GET/POST /api/favorites`, `PATCH/DELETE /api/favorites/[id]` | Bearer JWT | Saved locations (Supabase) |
| `GET/PUT /api/prefs` | Bearer JWT | User preferences (Supabase) |
| `POST /api/vitals` | — | Web-vitals sink (LCP/INP/CLS/FCP/TTFB) |
| `GET /api/metrics` | — | In-process RED + cache-hit snapshot (stopgap; not a TSDB) |
| `POST /api/analytics` | — | Opt-in anonymized product events |

All requests get a structured JSON log line with an `x-request-id`; logs scrub PII and
coarsen coordinates. Auth routes verify the Supabase JWT and return `{ error }` envelopes
on failure (401/400/409).

## Project layout

```
src/
├── app/            # routes + /api/* handlers, layout, globals.css
├── components/     # search, hero, forecast, favorites, auth, ui, observability
├── hooks/          # useWeather, useGeocode, usePreferences, useAuth, useFavorites
├── lib/            # weatherClient, units, wmo, validation, logger, metrics,
│                   #   analytics, errorTracking, supabase, auth, favorites
└── test/           # Vitest unit/integration tests
```

## Docker

A production image is defined here (standalone output). From the repo root:

```bash
make docker-build      # docker build -t weather-web apps/web
make docker-run        # runs on :3000
```

## Known gaps

- **ESLint not configured** — the `lint` script is a placeholder; type safety is covered by
  `typecheck` + `build`.
- **Air quality is best-effort** — renders as absent if the AQI provider call fails.
- **Supabase behavior is code-complete but not live-verified** — real OAuth, RLS, and
  cross-device sync require a Supabase project (see `doc/specs/build-weather-app/`).

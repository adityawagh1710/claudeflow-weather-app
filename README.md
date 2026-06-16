# Weather App

A weather application: search any location and view current conditions, hourly and 7-day
forecasts, and air quality — in a glassmorphic light/dark UI. Weather data is from
**Open-Meteo** (keyless). Planned as a **Tauri desktop app** backed by **Supabase** for
accounts and cross-device sync.

> **Status:** the web/API layer is built and tested. The Tauri desktop shell and a live
> Supabase backend are specced but **not yet wired up** (they need a Rust toolchain and a
> Supabase project — see _Planned / not yet built_ below).

## What's built

- **Web app + API** (`apps/web/`) — Next.js 15, React 19, TypeScript strict.
- **Weather** — `weatherClient` normalizes Open-Meteo into a stable model; current,
  hourly, 7-day, and air-quality views; city search + IP-based first-launch location.
- **Preferences** — °C/°F, km·h/mph, 12h/24h, light/dark/system (localStorage; syncs to
  Supabase when configured).
- **Observability** — structured request logging with `x-request-id` + PII scrubbing,
  web-vitals + RED/cache metrics endpoints, SDK-agnostic error tracking, and opt-in
  anonymized analytics (honors DNT/GPC).
- **Supabase slice (code-complete, gated off without env)** — schema + RLS migrations,
  auth client/hooks, auth-required favorites/prefs routes, and favorites sync UI with a
  localStorage fallback.
- **Quality** — 154 unit/integration tests, ≥80% coverage gate on `src/lib`, Playwright
  E2E (incl. an axe accessibility scan), and a production Dockerfile.

## Quick start

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000
```

No environment variables are required — Open-Meteo is keyless and Supabase is optional.

## Run the whole app with Docker Compose

```bash
docker compose up --build      # builds + starts → http://localhost:3000
docker compose down            # stops + removes
```

Runs with zero config (Open-Meteo is keyless; Supabase optional/off). To enable Supabase
or error tracking, create a root `.env` — Compose auto-loads it (`NEXT_PUBLIC_*` are baked
at build time, the rest read at runtime). `make up` / `make down` are shortcuts.

## Make targets (repo root)

```bash
make help            # list targets
make install         # npm ci in apps/web
make dev             # run the web app
make check           # typecheck + coverage + build
make up / make down  # start / stop the full app via docker compose
make docker-build    # build the production image
make docker-run      # run it on :3000 (PORT/TAG overridable)
```

## Repository layout

```
apps/
  web/               # Next.js web + API (built)        → apps/web/README.md
  desktop/           # Tauri shell (planned — not present yet)
supabase/
  migrations/        # schema + RLS + signup trigger (artifact; not yet applied)
doc/specs/
  build-weather-app/ # brainstorm → spec → tasks → implementation log
```

## Architecture (target)

A Tauri desktop shell hosts a static Next.js UI that calls a remotely-hosted Next.js API,
which proxies Open-Meteo and persists accounts/favorites/preferences in Supabase
(Postgres + Auth, with RLS). An on-device cache keeps the app usable offline and syncs
when reconnected. Full design and decisions: `doc/specs/build-weather-app/02-specification.md`.

## Planned / not yet built

These require infrastructure not available in the current environment:

- **Tauri desktop shell, offline cache+sync, packaging** — need a Rust toolchain + system
  webkit libraries.
- **Live Supabase** (real OAuth, RLS enforcement, cross-device sync) — need a Supabase
  project + keys. The code and migrations exist; set the variables in
  `apps/web/.env.example` and apply `supabase/migrations/` to enable.

See `doc/specs/build-weather-app/03-tasks.md` for exact task status.

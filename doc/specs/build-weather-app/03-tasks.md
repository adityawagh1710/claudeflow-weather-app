# Tasks: Weather App

**Spec:** doc/specs/build-weather-app/02-specification.md
**Created:** 2026-06-16 00:00
**Last Updated:** 2026-06-16 15:00
**Last Decompose:** 2026-06-16 15:00

## Summary

| Status | Count |
|--------|-------|
| ⏳ Pending | 0 |
| 🔄 In Progress | 0 |
| ✅ Completed | 13 |
| 🔄 In Progress | 0 |
| 🔄 Partial | 9 (1.1, 1.3, 1.4, 2.4, 2.8, 3.2, 3.3, 5.2, 5.3) |
| ⛔ Blocked (env) | 3 (2.10, 4.2, 3.4 — Rust/live-verify) |
| **Total** | **25** |

> **Session 4 (2026-06-16) — complete.** Supabase slice built as verifiable code (no live
> project). 🔄 1.3 (migration SQL + RLS + signup trigger), 🔄 1.4 (supabase client + auth
> hooks, gated on `isSupabaseConfigured()`), 🔄 2.4 (auth API routes: favorites CRUD + prefs,
> 401/400/409, JWT verify, logging+error-capture), 🔄 2.8 (favorites sync UI: add/list/
> reorder/remove/quick-switch, optimistic + localStorage fallback; gated auth UI), 🔄 3.2
> (mocked-integration tests for the routes). Added `@supabase/supabase-js`, `.env.example`.
> Verified: typecheck clean, **154 tests pass**, src/lib coverage 95.36%/89.41% (gate holds),
> `next build` ✓ (no Supabase env needed), E2E 5/5. **Deferred to live Supabase:** real OAuth,
> RLS enforcement, JWT acceptance, cross-device sync, signup-trigger firing.
> **Hard-blocked (Rust/system-webkit/display):** 2.10, 4.2, 1.1-desktop; live RLS verify 3.4.

> **Incremental decompose 2026-06-16 15:00:** Added Phase 5 (Observability & Analytics)
> tasks 5.1–5.4 from Changelog 14:30 / spec §12.
> **Session 3 — complete.** ✅ 5.1 (structured logging + requestId, PII scrubber, provider
> timing), ✅ 5.4 (opt-in analytics, DNT/GPC honored, payload whitelist), 🔄 5.2 partial
> (web-vitals → /api/vitals + in-process RED/cache /api/metrics; TSDB export + sync-health
> deferred), 🔄 5.3 partial (SDK-agnostic error tracking, fail-closed PII scrub, version/
> platform/online tags; live DSN + source-maps deploy-gated). Verified: typecheck clean,
> 82 tests pass, src/lib coverage 93.75%/86.54% (gate ≥80% holds), `next build` ✓ (6 routes).

> **Session 2 (2026-06-16) — complete.** ✅ 3.5 (coverage gate: lib 97% lines / 93.75%
> branches, 46 unit tests), ✅ 4.1 (a11y/perf: landmarks, combobox ARIA, contrast both
> themes, focus-visible, axe scan zero violations), 🔄 3.3 partial (web-core E2E: IP
> bootstrap, search→select, unit-toggle — 5/5 Playwright tests pass; offline/favorites
> flows still need Tauri+Supabase). Verified: typecheck clean, coverage gate passes,
> `next build` ✓, `playwright test` 5/5 pass.
> **Still blocked on env (Rust + Supabase):** 1.3, 1.4, 2.4, 2.8, 2.10, 4.2; 1.1 desktop.

> **Completed this session (web-core):** 1.2, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.9
> (localStorage), 3.1. **Partial:** 1.1 (Next.js web scaffold done; Tauri shell blocked).
> Verified: typecheck clean, 27/27 vitest tests pass, `next build` succeeds (7/7 pages,
> 102 kB shared JS), live Open-Meteo reachable (22.2°C London). Code at `apps/web/`.
> **Blocked on env (need Rust + Supabase):** 1.3, 1.4, 2.4, 2.8, 2.10, 3.2, 3.4, 4.2.
> **Pending (need running UI / full suite):** 3.3 (E2E), 3.5 (coverage gate), 4.1 (a11y/perf).

> **Session note (2026-06-16):** Executing **web-core only** — Rust/`cargo` and a live
> Supabase project are unavailable in this environment. In-scope this session: 1.1 (web),
> 1.2, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 2.9, 3.1. Deferred/blocked: Tauri shell (1.1-desktop,
> 2.10, 4.2), Supabase auth/db/favorites (1.3, 1.4, 2.4, 2.8, 3.2, 3.4). Preferences (2.9)
> persist to localStorage this session; Supabase sync wired later.

---

## Phase 1: Foundation

### Task 1.1: Monorepo + Next.js + Tauri scaffold
**Status:** ⏳ pending
**Priority:** high
**Depends On:** none

**Description:**
Establish the project structure per spec §8:
```
weather-app/
├── apps/desktop/   # Tauri shell (Rust)
├── apps/web/       # Next.js (UI static export + API routes)
├── supabase/       # migrations + RLS policies
```
- Initialize Next.js (App Router, TypeScript) in `apps/web`.
- Configure static export for the desktop build target while keeping `/api/*` routes
  runnable on the deployed server build (two build modes: `export` for desktop UI,
  server build for the deployed API host).
- Initialize a Tauri app in `apps/desktop` whose webview loads the exported Next.js UI.
- Add env wiring: `NEXT_PUBLIC_API_BASE_URL` (client → remote API base URL per env).

**Technical Requirements:**
- TypeScript strict mode; ESLint + Prettier configured.
- Files < 800 lines; feature-based organization.
- No secrets in client bundle.

**Acceptance Criteria:**
- [ ] `apps/web` dev server runs and renders a placeholder page.
- [ ] Tauri shell launches and loads the Next.js UI in a webview window.
- [ ] `NEXT_PUBLIC_API_BASE_URL` resolves correctly in dev and export builds.
- [ ] Lint/format/typecheck pass.

**Files to Modify:**
- `apps/web/*`, `apps/desktop/*`, root config files

---

### Task 1.2: Design tokens, theming, glassmorphism base
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 1.1

**Description:**
Implement the visual foundation per spec §6 (FR-7) and design rules:
- `styles/tokens.css` — color, type scale (clamp-based), spacing, durations, easings as
  CSS custom properties (no hardcoded palette repetition).
- Light + dark theme variables; `theme` = light/dark/system, applied at the root.
- `styles/glass.css` — glassmorphism surfaces using `backdrop-filter` with a
  **solid-surface fallback** when `backdrop-filter` is unsupported (Tauri webview parity,
  spec §10) and under `prefers-reduced-motion`.

**Acceptance Criteria:**
- [ ] Both themes render intentionally (not template-default) and pass contrast checks.
- [ ] Glass surfaces degrade to solid surfaces where `backdrop-filter` is unavailable.
- [ ] Reduced-motion disables non-essential animation.

**Files to Modify:**
- `apps/web/src/styles/tokens.css`, `glass.css`, theme provider

---

### Task 1.3: Supabase project, schema migrations, RLS
**Status:** 🔄 partial (SQL artifact written; apply-to-live-instance verification deferred)
**Completed (artifact):** 2026-06-16
**Priority:** high
**Depends On:** none
**Summary:** `supabase/migrations/0001_init.sql` (exact §3 schema, RLS on all 3 tables,
SECURITY DEFINER signup trigger seeding profiles + default preferences) + `0002_indexes.sql`.
Deferred: applying to a live instance; RLS cross-user enforcement verification (see 3.4).

**Description:**
Create Supabase project and migrations per spec §3 for tables `profiles`,
`preferences`, `favorites` (exact columns, checks, and unique constraints as specified).
Enable **Row-Level Security** on all three with policies restricting
`select/insert/update/delete` to `user_id = auth.uid()` (`id = auth.uid()` for
`profiles`). Add a trigger/policy to auto-create a `profiles` + default `preferences`
row on user signup.

**Acceptance Criteria:**
- [ ] Migrations apply cleanly to a fresh Supabase instance.
- [ ] RLS verified: a user cannot read or write another user's rows.
- [ ] Signup auto-creates `profiles` and default `preferences`.

**Files to Modify:**
- `supabase/migrations/*.sql`

---

### Task 1.4: Supabase client + auth session wiring
**Status:** 🔄 partial (web client + auth hooks done; desktop OAuth + live session deferred)
**Completed (web):** 2026-06-16
**Priority:** high
**Depends On:** Task 1.1, Task 1.3
**Summary:** `lib/supabase.ts` (browser/server factories, `isSupabaseConfigured()`),
`lib/auth.ts` (`verifyAccessToken`, `getBearerToken`), `hooks/useAuth.ts` (email + OAuth,
disabled no-op when unconfigured). Deferred: Tauri loopback/deep-link OAuth, live session
persistence/refresh.

**Description:**
Add `lib/supabase` client. Implement desktop auth (spec FR-1): email + at least one
OAuth provider via Supabase Auth, using a **loopback/deep-link redirect** for the Tauri
shell. Persist the session token in OS-secure storage where available; auto-refresh on
expiry. Allowlist redirect URIs in Supabase.

**Acceptance Criteria:**
- [ ] Email sign-up/sign-in works from the desktop app.
- [ ] At least one OAuth provider works via loopback/deep-link.
- [ ] Session persists across relaunch and auto-refreshes.

**Files to Modify:**
- `apps/web/src/lib/supabase.ts`, auth components, Tauri deep-link config

---

## Phase 2: Core Implementation

### Task 2.1: `weatherClient` normalization layer
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 1.1

**Description:**
Implement `lib/weatherClient` that calls Open-Meteo (forecast + air-quality + geocoding)
and normalizes responses into the `WeatherSnapshot` model (spec §4). Canonical storage
units are metric (°C, km/h, 24h). Map WMO `weatherCode` → icon/label. Provider is fully
isolated here so UI/storage never touch raw Open-Meteo JSON.

**Acceptance Criteria:**
- [ ] Returns a valid `WeatherSnapshot` for given lat/lon.
- [ ] WMO codes map to correct condition labels/icons.
- [ ] Provider failures throw typed errors (handled upstream).
- [ ] Unit tests cover normalization + edge cases (missing AQI → `null`).

**Files to Modify:**
- `apps/web/src/lib/weatherClient.ts`

---

### Task 2.2: Units conversion utilities
**Status:** ⏳ pending
**Priority:** medium
**Depends On:** none

**Description:**
Pure render-time conversion helpers (spec §4, FR-7): °C↔°F, km/h↔mph, 24h↔12h time
formatting, wind-direction → compass. Pure functions, no mutation.

**Acceptance Criteria:**
- [ ] Conversions correct (unit-tested with known values).
- [ ] No mutation; pure functions.

**Files to Modify:**
- `apps/web/src/lib/units.ts`

---

### Task 2.3: API routes — `/api/geocode`, `/api/weather`, `/api/iplocation`
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.1

**Description:**
Implement public API routes (spec §5) on the deployed Next.js server:
- `GET /api/geocode?q=` → proxy Open-Meteo geocoding, return ranked candidates.
- `GET /api/weather?lat=&lon=` → proxy + normalize into `WeatherSnapshot` via `weatherClient`.
- `GET /api/iplocation` → approximate location from request IP (first-launch bootstrap).
Add short server-side caching (5–10 min) + request coalescing for Open-Meteo fair use
(spec §10). Validate all inputs at the boundary (lat/lon ranges, query length); return
clear error envelopes.

**Acceptance Criteria:**
- [ ] Each route returns expected shapes; invalid inputs rejected with clear errors.
- [ ] Responses cached briefly; repeat requests don't re-hit Open-Meteo.
- [ ] Integration tests with mocked Open-Meteo.

**Files to Modify:**
- `apps/web/src/app/api/geocode/route.ts`, `weather/route.ts`, `iplocation/route.ts`

---

### Task 2.4: API routes — `/api/favorites`, `/api/prefs` (auth-required)
**Status:** 🔄 partial (routes implemented + mock-tested; live Supabase integration deferred)
**Completed (code):** 2026-06-16
**Priority:** high
**Depends On:** Task 1.3, Task 1.4
**Summary:** `/api/favorites` (GET/POST, 409 unique), `/api/favorites/[id]` (PATCH/DELETE),
`/api/prefs` (GET/PUT upsert). JWT verify → 401; validation → 400; `{error}` envelopes;
withRequestLogging + captureException; RLS defense-in-depth. Schemas in lib (tested).
Deferred: live JWT acceptance + RLS.

**Description:**
Implement auth-required routes (spec §5) verifying the Supabase JWT from
`Authorization: Bearer`:
- `GET/POST /api/favorites`, `PATCH/DELETE /api/favorites/:id` (reorder/remove).
- `GET/PUT /api/prefs` (read/upsert preferences).
Validate enums (temp/wind/time/theme) and lat/lon. Rely on RLS as defense-in-depth.

**Acceptance Criteria:**
- [ ] Unauthenticated requests rejected (401).
- [ ] CRUD works and respects unique `(user_id, lat, lon)`.
- [ ] Integration tests with mocked Supabase.

**Files to Modify:**
- `apps/web/src/app/api/favorites/route.ts`, `favorites/[id]/route.ts`, `prefs/route.ts`

---

### Task 2.5: Data fetching layer (TanStack Query, cache-then-revalidate)
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.3

**Description:**
Set up TanStack Query with stale-while-revalidate for weather/geocode. Hooks:
`useWeather(lat,lon)`, `useGeocode(q)`, `usePreferences()`, `useFavorites()`. Cache-first
render then background refresh (spec NFR perceived-instant).

**Acceptance Criteria:**
- [ ] Cached data renders immediately; revalidates in background.
- [ ] Hooks expose loading/error/data states.

**Files to Modify:**
- `apps/web/src/hooks/*`, query client provider

---

### Task 2.6: Location search + selection UI (FR-2)
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.5, Task 1.2

**Description:**
City search input → ranked candidates (name/region/country) from `/api/geocode`;
selecting loads its `WeatherSnapshot`. First launch with no favorites bootstraps via
`/api/iplocation`.

**Acceptance Criteria:**
- [ ] Typing a city shows ranked candidates; selection loads weather.
- [ ] First launch auto-detects approximate location via IP.
- [ ] Keyboard navigable.

**Files to Modify:**
- `apps/web/src/components/search/*`

---

### Task 2.7: Current conditions + forecast + AQI UI (FR-3, FR-4, FR-5)
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.5, Task 2.2, Task 1.2

**Description:**
Render current conditions (temp, apparent, condition icon+label, humidity, wind+dir,
day/night, observed time), hourly forecast (~24–48h with precip probability), 7-day
forecast (min/max, condition, sunrise/sunset, max UV), and current AQI with category.
Units/time format driven by preferences at render.

**Acceptance Criteria:**
- [ ] All FR-3/4/5 fields display correctly from `WeatherSnapshot`.
- [ ] Unit/time changes re-render immediately.
- [ ] Glassmorphic layout, both themes.

**Files to Modify:**
- `apps/web/src/components/hero/*`, `forecast/*`

---

### Task 2.8: Favorites management UI + sync (FR-6)
**Status:** 🔄 partial (UI + hooks + optimistic/local-fallback done; cross-device sync deferred)
**Completed (web):** 2026-06-16
**Priority:** high
**Depends On:** Task 2.4, Task 2.5
**Summary:** `useFavorites`/`useRemotePreferences` (remote+optimistic when signed in,
localStorage fallback otherwise), `FavoritesPanel` (add/list/reorder/remove/quick-switch,
accessible), gated `AuthPanel`. Deferred: cross-device sync verification (live Supabase).

**Description:**
Add current location to favorites; list, reorder (sort_order), remove; quick-switch
loads each favorite (cache-first then refresh). Persists to Supabase and syncs across
devices when signed in.

**Acceptance Criteria:**
- [ ] Add/reorder/remove work and persist.
- [ ] Changes appear on a second signed-in device.
- [ ] Quick-switch loads weather cache-first.

**Files to Modify:**
- `apps/web/src/components/favorites/*`

---

### Task 2.9: Preferences UI — unit + theme toggles (FR-7)
**Status:** ⏳ pending
**Priority:** medium
**Depends On:** Task 2.4, Task 1.2

**Description:**
Toggles for temperature (°C/°F), wind (km·h/mph), time (12h/24h), theme
(light/dark/system). Persist to `preferences`; apply at render.

**Acceptance Criteria:**
- [ ] Each toggle updates rendering immediately and persists across relaunch.

**Files to Modify:**
- `apps/web/src/components/ui/preferences/*`, `hooks/usePreferences.ts`

---

### Task 2.10: Offline cache + background sync (FR-8)
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.5, Task 2.8, Task 2.9

**Description:**
Implement on-device cache (Tauri store, spec §3): `last_weather:{lat},{lon}`,
`favorites_cache`, `preferences_cache`, `pending_mutations`. On launch without
connectivity, render cached weather/favorites/prefs with a visible staleness label
(`fetchedAt`). Queue offline mutations and replay on reconnect. Conflict resolution:
last-write-wins by `updated_at` for prefs; per-row reconciliation for favorites
(spec §10).

**Acceptance Criteria:**
- [ ] Offline relaunch renders cached data with staleness indicator.
- [ ] Favorite added offline syncs after reconnect.
- [ ] Conflict resolution behaves as specified.

**Files to Modify:**
- `apps/web/src/lib/cache.ts`, sync logic, Tauri store bindings

---

## Phase 3: Testing & Validation

### Task 3.1: Unit tests — weatherClient + units
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.1, Task 2.2

**Description:**
TDD unit coverage for normalization (WMO mapping, missing AQI) and all unit conversions.

**Acceptance Criteria:**
- [ ] Edge cases covered; tests pass.

**Files to Modify:**
- `apps/web/src/lib/__tests__/*`

---

### Task 3.2: Integration tests — API routes
**Status:** 🔄 partial (auth routes mock-tested; live Supabase integration test deferred)
**Completed (mocked):** 2026-06-16
**Priority:** high
**Depends On:** Task 2.3, Task 2.4
**Summary:** `favoritesRoute`, `favoriteIdRoute`, `prefsRoute` tests with mocked Supabase
client + token verify (401/400/409, CRUD shapes, enum validation). Deferred: integration
against a live Supabase instance.

**Description:**
Integration tests for all `/api/*` routes with mocked Open-Meteo + Supabase: auth
enforcement, input validation, caching behavior, error envelopes.

**Acceptance Criteria:**
- [ ] Auth-required routes reject unauthenticated requests.
- [ ] Validation + caching verified.

**Files to Modify:**
- `apps/web/src/app/api/__tests__/*`

---

### Task 3.3: E2E tests — critical flows
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 2.6, Task 2.7, Task 2.8, Task 2.9, Task 2.10

**Description:**
E2E for: search → view → favorite → unit-toggle → offline-relaunch (spec §7). Use
deterministic waits; visual regression at 320/768/1024/1440 for both themes.

**Acceptance Criteria:**
- [ ] All critical flows pass.
- [ ] Visual regression snapshots captured both themes.

**Files to Modify:**
- `apps/web/e2e/*`

---

### Task 3.4: Security & RLS verification
**Status:** ⏳ pending
**Priority:** high
**Depends On:** Task 1.3, Task 2.4

**Description:**
Verify no secrets in shipped desktop bundle; service-role key server-only; RLS blocks
cross-user access; HTTPS-only; inputs validated at boundaries (spec §7). Run
security-reviewer agent on auth + API code.

**Acceptance Criteria:**
- [ ] No secrets in client bundle.
- [ ] Cross-user access blocked (verified).
- [ ] Security review passes (no CRITICAL/HIGH).

**Files to Modify:**
- N/A (review + config hardening)

---

### Task 3.5: Coverage gate ≥ 80%
**Status:** ⏳ pending
**Priority:** medium
**Depends On:** Task 3.1, Task 3.2, Task 3.3

**Description:**
Ensure combined unit/integration/E2E coverage meets the ≥ 80% requirement (spec §7).

**Acceptance Criteria:**
- [ ] Coverage ≥ 80%; CI gate enforces it.

**Files to Modify:**
- CI config, coverage thresholds

---

## Phase 4: Documentation & Polish

### Task 4.1: Accessibility & performance pass
**Status:** ⏳ pending
**Priority:** medium
**Depends On:** Task 2.7, Task 2.8, Task 2.9

**Description:**
Keyboard nav, contrast (both themes), reduced-motion, CWV-style budgets; first
meaningful render < 1.5s on cached data (spec §7). Run Lighthouse/a11y checks.

**Acceptance Criteria:**
- [ ] A11y checks pass; reduced-motion respected.
- [ ] Perf budgets met.

**Files to Modify:**
- Component-level fixes as needed

---

### Task 4.2: Build, packaging & deployment docs
**Status:** ⏳ pending
**Priority:** low
**Depends On:** Task 1.1, Task 3.5

**Description:**
Document the static-export/API split (spec §10): building the Tauri client with the
correct `NEXT_PUBLIC_API_BASE_URL` per env, deploying the Next.js API host, Supabase
redirect URI allowlist, and Tauri packaging for Windows/macOS/Linux. Update README +
ARCHITECTURE.

**Acceptance Criteria:**
- [ ] Docs let a new dev build the desktop app + deploy the API.
- [ ] Env/redirect config documented.

**Files to Modify:**
- `README.md`, `ARCHITECTURE.md`

---

## Parallelization Strategy

Tasks that can be executed in parallel (no dependencies between them):

### Parallel Group 1 (kickoff)
- Task 1.1: Monorepo + Next.js + Tauri scaffold
- Task 1.3: Supabase project, schema migrations, RLS

### Parallel Group 2 (after 1.1)
- Task 1.2: Design tokens / theming / glass
- Task 2.1: weatherClient normalization
- Task 2.2: Units conversion utilities  *(no deps — can start anytime)*

### Parallel Group 3 (core APIs)
- Task 2.3: Public API routes (after 2.1)
- Task 2.4: Auth-required API routes (after 1.3 + 1.4)

### Parallel Group 4 (UI surfaces, after 2.5)
- Task 2.6: Search UI
- Task 2.7: Conditions/forecast/AQI UI
- Task 2.9: Preferences UI

### Parallel Group 5 (tests, after corresponding impl)
- Task 3.1: Unit tests (after 2.1/2.2)
- Task 3.2: Integration tests (after 2.3/2.4)

### Sequential Dependencies
1. Task 1.1 → Task 1.2 → Task 2.6/2.7/2.9 (UI needs scaffold + tokens)
2. Task 1.3 → Task 1.4 → Task 2.4 → Task 2.8 (auth/db → favorites)
3. Task 2.1 → Task 2.3 → Task 2.5 → UI hooks
4. Task 2.5 + 2.8 + 2.9 → Task 2.10 (offline cache needs the data layers)
5. Task 2.6/2.7/2.8/2.9/2.10 → Task 3.3 (E2E) → Task 3.5 (coverage gate)
6. Task 3.1/3.2/3.3 → Task 3.5 → Task 4.2

---

## Phase 5: Observability & Analytics

> Source: Spec §12 + Changelog 2026-06-16 14:30. Added via incremental decompose
> 2026-06-16 15:00.

### Task 5.1: Structured server logging + requestId correlation ✅
**Status:** ✅ completed
**Priority:** high
**Added:** 2026-06-16 15:00
**Started:** 2026-06-16 15:00
**Completed:** 2026-06-16 15:30
**Summary:** `lib/logger.ts` (single-line JSON, levels, `scrub()` for email/token/IP,
`coarseCoord()` 2dp, `getRequestId`, `withRequestLogging`, `timeProvider` slow-warn).
Wired into geocode/weather/iplocation; `x-request-id` echoed. 16 tests.
**Source:** Changelog 2026-06-16 14:30 — Add Observability & Analytics
**Depends On:** Task 2.3
**Doable now:** YES (web core has API routes)

**Description:**
Add a structured JSON logger (`lib/logger.ts`) and wrap all `/api/*` route handlers
(spec §12.1). Each request emits one line: `timestamp`, `level`, `requestId`, `route`,
`method`, `status`, `durationMs`, `cacheHit`, coarse `provider`. Generate/propagate
`requestId` from header `x-request-id` (create if absent) and echo it on the response.
Coarsen coordinates to ~2 dp in logs; never log secrets, tokens, emails, or raw query
text beyond length. Levels: debug/info/warn/error/fatal. Log Open-Meteo/ipapi latency +
status; `warn` near fair-use thresholds.

**Acceptance Criteria:**
- [ ] Every API request emits exactly one structured log line with `requestId` + `durationMs`.
- [ ] No secrets/PII/full-precision coordinates appear in any log (unit-tested scrubber).
- [ ] `x-request-id` propagated in and echoed out.

**Files to Modify:**
- `apps/web/src/lib/logger.ts`, `src/app/api/*/route.ts`

---

### Task 5.2: Web-vitals + RED/cache metrics 🔄 PARTIAL
**Status:** 🔄 partial (web parts done; TSDB export + sync-health deferred)
**Completed (web):** 2026-06-16 15:30
**Summary:** web-vitals reporter → `POST /api/vitals`; in-process `MetricsRegistry`
(RED p50/p95 + cache-hit + provider health) via `GET /api/metrics`. Real TSDB export and
sync-health (needs Supabase 2.8) deferred — noted in code.
**Priority:** medium
**Added:** 2026-06-16 15:00
**Source:** Changelog 2026-06-16 14:30 — Add Observability & Analytics
**Depends On:** Task 5.1
**Doable now:** PARTIAL (RED + cache-hit + web-vitals doable; sync-health needs Supabase)

**Description:**
Per spec §12.3: emit RED metrics per route (rate/errors/duration p50/p95/p99) and
weather/geocode cache-hit ratio from the logger data; report client web-vitals
(LCP/INP/CLS) via the `web-vitals` package to a `/api/vitals` sink. Provider health
(Open-Meteo/ipapi error rate + latency) surfaced. Sync-health metrics deferred until
Supabase lands (Task 2.8).

**Acceptance Criteria:**
- [ ] RED + cache-hit metrics queryable/exportable per route.
- [ ] LCP/INP/CLS reported from the running app.
- [ ] Provider health metrics emitted.

**Files to Modify:**
- `apps/web/src/lib/metrics.ts`, `src/app/api/vitals/route.ts`, web-vitals reporter in layout

---

### Task 5.3: Client + server error tracking with PII scrubbing 🔄 PARTIAL
**Status:** 🔄 partial (SDK-agnostic core done; live DSN + source-maps deploy-gated)
**Completed (core):** 2026-06-16 15:30
**Summary:** `lib/errorTracking.ts` — pluggable transport (no-op without `ERROR_TRACKING_DSN`),
mandatory fail-closed `beforeSend` PII scrub, tags appVersion/platform/online. Wired to
window error/unhandledrejection + route catches. Live DSN + source-map upload deferred.
**Priority:** high
**Added:** 2026-06-16 15:00
**Source:** Changelog 2026-06-16 14:30 — Add Observability & Analytics
**Depends On:** Task 5.1
**Doable now:** PARTIAL (SDK wiring + scrubbing testable; live DSN/source-map upload needs deploy env)

**Description:**
Integrate a Sentry-compatible error tracker on client + server (spec §12.2). Mandatory
`beforeSend` scrubbing strips emails, tokens, exact coordinates, IP; **fail closed**
(drop event) if scrubbing can't apply. Tag events with `appVersion`, `platform`
(web/desktop), `online`/`offline`. DSN via env; source maps uploaded at build (not
shipped publicly).

**Acceptance Criteria:**
- [ ] Client + server errors reach the tracker (or no-op when DSN unset).
- [ ] Test asserts synthetic email/token/coordinate removed before send.
- [ ] Events tagged with version/platform/online-state.

**Files to Modify:**
- `apps/web/src/lib/errorTracking.ts`, instrumentation hooks, build config

---

### Task 5.4: Opt-in product analytics ✅
**Status:** ✅ completed
**Completed:** 2026-06-16 15:30
**Summary:** `lib/analytics.ts` — opt-in (default off), DNT + GPC honored, rotating
anonymous install id, per-event payload whitelist (no query text / location / user id).
`analyticsOptIn` in usePreferences + accessible toggle in PreferencesBar; wired to
search-select, unit + theme toggles. 9 tests incl. PII-leak assertions.
**Priority:** medium
**Added:** 2026-06-16 15:00
**Source:** Changelog 2026-06-16 14:30 — Add Observability & Analytics
**Depends On:** Task 5.1
**Doable now:** YES (client events + opt-out scaffold; no backend required)

**Description:**
Anonymized aggregate events only (spec §12.4): `location_searched` (count, no query text),
`favorite_added/removed`, `unit_toggled`, `theme_changed`, `offline_render`. No precise
location, no search terms, no user id beyond a rotating anonymous install id. **Off until
opt-in**; clear in-app opt-out disables product events (error reporting may remain). Honor
DNT/platform privacy signals.

**Acceptance Criteria:**
- [ ] Product analytics off until opt-in; opt-out stops product events.
- [ ] No location/search-text/user-id in any event payload (unit-tested).
- [ ] DNT respected.

**Files to Modify:**
- `apps/web/src/lib/analytics.ts`, opt-in/out UI in PreferencesBar, `usePreferences`

---

## Phase 5 Parallelization
- Task 5.1 first (logger underpins the rest).
- After 5.1: Task 5.2, 5.3, 5.4 can proceed in parallel (independent modules).
- Web-doable now: 5.1 (full), 5.4 (full), 5.2/5.3 (partial — full verification needs deploy/Supabase).

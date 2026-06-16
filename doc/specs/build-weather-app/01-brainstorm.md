# Build Weather App

**Slug:** build-weather-app
**Author:** Claude Code
**Date:** 2026-06-16
**Branch:** preflight/build-weather-app
**Related:** _none yet — greenfield project_

---

## 1) Intent & Assumptions

- **Task brief:** Build a Weather App — an application that lets a user view current
  weather conditions and a forecast for one or more locations.
- **Assumptions:**
  - Greenfield project — the repo is currently empty (only a `doc/` directory exists),
    so there is no existing stack to conform to.
  - The app consumes a third-party weather data provider (we are not running our own
    meteorological models).
  - Primary use case is consumer-facing: search a location → see current + forecast.
  - Internet access at runtime is available (live API calls).
  - Free / low-cost data tier is acceptable for an initial build.
- **Out of scope (initial build):**
  - Running our own weather prediction / data ingestion pipeline.
  - User accounts, auth, and server-side persistence of user data (unless requested).
  - Push notifications and severe-weather alerting.
  - Native mobile app store packaging (iOS/Android) — TBD per platform choice below.
  - Monetization, ads, paid tiers.

## 2) Pre-reading Log

- `/home/adityawagh/claudeflow-demo-3/` (project root): contains only `doc/` — confirms
  this is a clean greenfield build with no prior code, configs, or framework choices.
- User global rules (`~/.claude/rules/web/*`): if the app is built as a web frontend,
  these apply — design-quality (anti-template policy), performance (CWV budgets, bundle
  budgets <150kb JS for a landing/microsite), security (CSP, headers), and testing
  (visual regression at 320/768/1024/1440, a11y, Lighthouse). Worth honoring from day one.
- Common rules: 80% test coverage minimum, TDD workflow, immutability, files <800 lines,
  no hardcoded secrets (the weather API key must live in env / a secret manager).

## 3) Codebase Map

- **Primary components/modules:** None yet — to be created. Anticipated shape:
  - `LocationSearch` (geocoding input → coordinates)
  - `CurrentConditions` (temp, condition, humidity, wind, etc.)
  - `Forecast` (hourly and/or multi-day)
  - `weatherClient` / data-access layer (wraps the provider API)
  - `units` + formatting utilities (°C/°F, km/h vs mph, 12h/24h)
- **Shared dependencies:** design tokens (CSS custom properties per web rules), a units
  store/context, a data-fetching layer (e.g. TanStack Query / SWR if React).
- **Data flow:** user query → geocode to lat/lon → fetch current + forecast from provider
  → normalize provider JSON into an internal model → render. Cache responses
  (stale-while-revalidate) to stay within free-tier rate limits.
- **Feature flags/config:** `WEATHER_API_KEY` (env), `DEFAULT_UNITS`, provider base URL.
- **Potential blast radius:** N/A (greenfield). Main long-term coupling risk is binding
  UI tightly to one provider's JSON shape — mitigated by a normalization layer.

## 4) Root Cause Analysis

Not applicable — this is a new feature build, not a bug fix. No existing behavior to
reproduce. (Section retained for template completeness.)

## 5) Research

### Weather data providers

1. **Open-Meteo** — free, open-source, **no API key required** for non-commercial use;
   high-resolution (1–11 km) data sourced from national weather services, JSON API,
   built-in geocoding and historical endpoints.
   - Pros: zero-friction (no signup/key), generous free tier, clean JSON, great for a
     demo/MVP, includes hourly + daily + air quality.
   - Cons: commercial use needs a paid plan; fewer "branded" condition icons; attribution
     expected.
2. **OpenWeatherMap** — very popular, large feature set (current, forecast, historical,
   maps/tiles), well-documented, huge community.
   - Pros: ubiquitous examples, commercial use allowed with attribution, rich ecosystem,
     One Call API bundles current+forecast.
   - Cons: requires API key (must be kept server-side), free tier rate-limited, some
     endpoints moved behind paid "One Call 3.0" subscription.
3. **WeatherAPI.com** — current, forecast, astronomy, air quality, generous free tier.
   - Pros: simple key-based auth, good free limits, bundled geocoding + condition icons.
   - Cons: key management, commercial limits on free tier.
4. **Visual Crossing / Meteomatics** — strong for historical + advanced data layers;
   more than an MVP needs, lower free quotas (Meteomatics ~1000 calls/mo).

**Recommendation:** Use **Open-Meteo for the MVP** — no key means the fastest path to a
working app and no secret-management overhead, and it bundles geocoding + forecast + air
quality. Isolate it behind a `weatherClient` normalization layer so we can swap to
OpenWeatherMap or WeatherAPI later (e.g. if commercial use or branded icons are needed)
without touching UI code. If a key-based provider is chosen, the key MUST be proxied
through a small server route — never shipped in client JS.

### Sources
- [Best Weather API for 2025 — Visual Crossing](https://www.visualcrossing.com/resources/blog/best-weather-api-for-2025/)
- [Best Weather APIs 2026 — Meteomatics](https://www.meteomatics.com/en/weather-api/best-weather-apis/)
- [Best Free and Paid Weather APIs — Nordic APIs](https://nordicapis.com/6-best-free-and-paid-weather-apis/)
- [Open-Source Weather API — Open-Meteo](https://open-meteo.com/)
- [Open Weather Map Alternatives — Meteosource](https://www.meteosource.com/blog/comparison-open-weather-map-alternatives)

### Stack notes (pending platform decision)
- **Web (recommended default):** React + Vite or Next.js. Next.js gives a built-in
  server route to proxy a keyed API and SSR for fast first paint; Vite is lighter if we
  go keyless (Open-Meteo) and pure client-side.
- **Data fetching:** TanStack Query / SWR for stale-while-revalidate caching and
  retry — avoids hammering the free tier and gives instant cached renders.
- **Design:** per web design-quality rules, avoid a generic centered-hero/card-grid
  template; pick an intentional direction (see clarification Q5).

## 6) Clarification

### Resolved (round 1)

1. ~~Platform/target: web, mobile, desktop, or CLI?~~ (RESOLVED)
   **Answer:** **Desktop app.** → Implies a packaging layer over the web stack
   (Electron or Tauri). See follow-up Q9.

2. ~~Tech stack preference?~~ (RESOLVED)
   **Answer:** **Next.js.** Will run as the app's UI/server layer, packaged for desktop.

3. ~~Data provider?~~ (RESOLVED)
   **Answer:** **Open-Meteo (keyless).** Free, no key, bundles geocoding + forecast +
   air quality. Wrapped behind a `weatherClient` normalization layer.

4. ~~v1 feature scope?~~ (RESOLVED)
   **Answer:** All four selected — **city search (geocoding), hourly + 7-day forecast,
   unit toggle (°C/°F, km·h/mph, 12h/24h), and saved locations + air quality (AQI, UV,
   sunrise/sunset).** Browser geolocation TBD (less relevant on desktop — see follow-up).

5. ~~Design direction & theme?~~ (RESOLVED)
   **Answer:** **Glassmorphism with real depth, both light + dark themes.** Weather-driven
   gradients/atmosphere. Per design-quality rules, avoid template defaults.

6. ~~Persistence model?~~ (RESOLVED)
   **Answer:** **Backend + accounts** — user auth with server-side sync of favorites and
   preferences across devices. This is a significant scope expansion; see follow-ups
   Q10–Q12.

### Follow-up questions (round 2 — emerged from round-1 answers)

The combination of **Desktop app + Next.js + Backend & accounts** introduces new
architectural decisions that need resolution before spec:

9. ~~Desktop packaging: Tauri or Electron?~~ (RESOLVED)
   **Answer:** **Tauri.** Rust shell + native webview, tiny binary, lower memory. The
   Next.js UI is served via static export / remote API rather than a bundled Node server.

10. ~~Backend hosting & API location?~~ (RESOLVED)
    **Answer:** **Remote Next.js host.** Next.js API routes/server actions deployed
    (Vercel/Fly/Railway); the Tauri desktop client calls them over HTTPS.

11. ~~Auth provider?~~ (RESOLVED)
    **Answer:** **Supabase Auth.** Managed auth that pairs with Supabase Postgres;
    desktop OAuth handled via loopback/deep-link redirect.

12. ~~Database for accounts + saved locations?~~ (RESOLVED)
    **Answer:** **Supabase Postgres.** Consolidates auth + data; row-level security and
    cross-device sync of favorites/preferences.

13. ~~Offline behavior?~~ (RESOLVED)
    **Answer:** **Local cache + sync.** Cache last-known weather + favorites on-device
    (Tauri local store), sync to Supabase when online.

14. ~~Initial location detection on desktop?~~ (RESOLVED)
    **Answer:** **IP-based lookup** on first launch, then manual city search.

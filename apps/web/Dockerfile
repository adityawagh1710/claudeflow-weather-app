# syntax=docker/dockerfile:1

# Multi-stage build for the Next.js weather web app (standalone output).
# Produces a slim runtime image that serves the remote API + UI.

ARG NODE_VERSION=24-alpine

# --- deps: install dependencies against the lockfile ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# --- builder: typecheck, coverage-gated tests, and build ---
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

# Supabase is OPTIONAL. NEXT_PUBLIC_* vars are inlined by Next.js at BUILD time, so to
# ship an image with auth/sync enabled they must be supplied here as build args:
#   docker build --build-arg NEXT_PUBLIC_SUPABASE_URL=... \
#                --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#                --build-arg NEXT_PUBLIC_API_BASE_URL=... -t weather-web apps/web
# Left empty, the image builds fine and runs in signed-out / localStorage mode.
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_API_BASE_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

RUN npm run typecheck \
  && npm run test:coverage \
  && npm run build

# --- runner: minimal production image ---
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Server-only secrets are supplied at RUNTIME (never baked into the image), e.g.
#   docker run --env-file apps/web/.env -p 3000:3000 weather-web
# Recognized runtime vars: SUPABASE_SERVICE_ROLE_KEY, ERROR_TRACKING_DSN, LOG_LEVEL.
# Note: database migrations (supabase/migrations/) are applied out-of-band, not here.

# Run as an unprivileged user.
RUN addgroup -g 1001 -S nodejs \
  && adduser -S nextjs -u 1001

# Standalone output bundles only what the server needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Basic container healthcheck against the app root.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

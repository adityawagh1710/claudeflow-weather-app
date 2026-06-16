/**
 * In-process RED-style metrics (Rate, Errors, Duration) plus cache-hit and
 * per-provider counters.
 *
 * NOTE: This in-process snapshot is a STOPGAP. In production these metrics
 * would be exported to a real time-series database (TSDB) such as Prometheus
 * so they survive restarts and aggregate across instances. Sync-health
 * metrics are deferred until Supabase lands (Task 2.8).
 */

const MAX_SAMPLES = 1000;

type RouteStats = {
  count: number;
  errors: number;
  cacheHits: number;
  durations: number[];
};

type ProviderStats = {
  count: number;
  errors: number;
  durations: number[];
};

export type RouteSnapshot = {
  readonly route: string;
  readonly count: number;
  readonly errors: number;
  readonly errorRate: number;
  readonly cacheHits: number;
  readonly cacheHitRate: number;
  readonly p50: number;
  readonly p95: number;
};

export type ProviderSnapshot = {
  readonly provider: string;
  readonly count: number;
  readonly errors: number;
  readonly errorRate: number;
  readonly p50: number;
  readonly p95: number;
};

export type MetricsSnapshot = {
  readonly capturedAt: string;
  readonly routes: ReadonlyArray<RouteSnapshot>;
  readonly providers: ReadonlyArray<ProviderSnapshot>;
};

/**
 * Nearest-rank percentile over a sample array. Returns 0 for empty input.
 */
export function percentile(samples: ReadonlyArray<number>, p: number): number {
  if (samples.length === 0) {
    return 0;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const clamped = Math.min(Math.max(p, 0), 100);
  const rank = Math.ceil((clamped / 100) * sorted.length);
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1);
  return sorted[index];
}

function pushBounded(arr: number[], value: number): void {
  arr.push(value);
  if (arr.length > MAX_SAMPLES) {
    arr.shift();
  }
}

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export class MetricsRegistry {
  private readonly routes = new Map<string, RouteStats>();
  private readonly providers = new Map<string, ProviderStats>();

  private routeStats(route: string): RouteStats {
    const existing = this.routes.get(route);
    if (existing) {
      return existing;
    }
    const created: RouteStats = {
      count: 0,
      errors: 0,
      cacheHits: 0,
      durations: [],
    };
    this.routes.set(route, created);
    return created;
  }

  private providerStats(provider: string): ProviderStats {
    const existing = this.providers.get(provider);
    if (existing) {
      return existing;
    }
    const created: ProviderStats = { count: 0, errors: 0, durations: [] };
    this.providers.set(provider, created);
    return created;
  }

  recordRequest(input: {
    route: string;
    status: number;
    durationMs: number;
    cacheHit?: boolean;
  }): void {
    const stats = this.routeStats(input.route);
    stats.count += 1;
    if (input.status >= 500) {
      stats.errors += 1;
    }
    if (input.cacheHit) {
      stats.cacheHits += 1;
    }
    pushBounded(stats.durations, input.durationMs);
  }

  recordProvider(input: {
    provider: string;
    status: number;
    durationMs: number;
  }): void {
    const stats = this.providerStats(input.provider);
    stats.count += 1;
    if (input.status >= 400) {
      stats.errors += 1;
    }
    pushBounded(stats.durations, input.durationMs);
  }

  snapshot(): MetricsSnapshot {
    const routes: RouteSnapshot[] = [];
    for (const [route, s] of this.routes.entries()) {
      routes.push({
        route,
        count: s.count,
        errors: s.errors,
        errorRate: rate(s.errors, s.count),
        cacheHits: s.cacheHits,
        cacheHitRate: rate(s.cacheHits, s.count),
        p50: percentile(s.durations, 50),
        p95: percentile(s.durations, 95),
      });
    }
    const providers: ProviderSnapshot[] = [];
    for (const [provider, s] of this.providers.entries()) {
      providers.push({
        provider,
        count: s.count,
        errors: s.errors,
        errorRate: rate(s.errors, s.count),
        p50: percentile(s.durations, 50),
        p95: percentile(s.durations, 95),
      });
    }
    return {
      capturedAt: new Date().toISOString(),
      routes,
      providers,
    };
  }

  reset(): void {
    this.routes.clear();
    this.providers.clear();
  }
}

/** Process-wide registry shared by route wrappers and the metrics endpoint. */
export const metrics = new MetricsRegistry();

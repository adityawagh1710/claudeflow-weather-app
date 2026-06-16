/**
 * Structured server-side logging with PII scrubbing.
 *
 * Emits single-line JSON to stdout. Designed for ingestion by a log
 * aggregator. Never log raw query text, emails, tokens, or precise
 * coordinates: use the provided scrubbers.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

/** Threshold (ms) above which a provider call is flagged as slow. */
export const SLOW_PROVIDER_MS = 2500;

export type LogContext = Readonly<Record<string, unknown>>;

export type LogFields = {
  readonly requestId?: string;
  readonly route?: string;
  readonly method?: string;
  readonly status?: number;
  readonly durationMs?: number;
  readonly cacheHit?: boolean;
  readonly provider?: string;
  readonly context?: LogContext;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Bearer tokens and bare JWTs (three base64url segments).
const BEARER_RE = /\b[Bb]earer\s+[A-Za-z0-9._\-+/=]+/g;
const JWT_RE = /\beyJ[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g;
// IPv4 addresses.
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

const REDACTED = "[redacted]";

/** A number that "looks like a coordinate": within plausible lat/lon range. */
function looksLikeCoordinate(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180 && !Number.isInteger(n);
}

/** Round a coordinate-like number to 2 decimal places (~1.1km precision). */
export function coarseCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function scrubString(value: string): string {
  return value
    .replace(JWT_RE, REDACTED)
    .replace(BEARER_RE, REDACTED)
    .replace(EMAIL_RE, REDACTED)
    .replace(IPV4_RE, REDACTED);
}

/**
 * Recursively redact PII from arbitrary contextual data.
 * - Emails, bearer/jwt tokens, and IPs are removed from strings.
 * - Numbers that look like coordinates are rounded to 2dp.
 */
export function scrub(value: unknown): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (typeof value === "number") {
    return looksLikeCoordinate(value) ? coarseCoord(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => scrub(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = scrub(val);
    }
    return out;
  }
  return value;
}

function resolveMinLevel(): number {
  if (process.env.LOG_LEVEL === "debug") {
    return LEVEL_ORDER.debug;
  }
  if (process.env.NODE_ENV !== "production") {
    return LEVEL_ORDER.debug;
  }
  return LEVEL_ORDER.info;
}

export interface Logger {
  log(level: LogLevel, message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  fatal(message: string, fields?: LogFields): void;
}

type Sink = (line: string) => void;

const defaultSink: Sink = (line) => {
  // Structured logger is the sanctioned stdout sink for the server.
  // eslint-disable-next-line no-console
  console.log(line);
};

export function createLogger(sink: Sink = defaultSink): Logger {
  const minLevel = resolveMinLevel();

  const emit = (level: LogLevel, message: string, fields?: LogFields): void => {
    if (LEVEL_ORDER[level] < minLevel) {
      return;
    }
    const base: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (fields) {
      if (fields.requestId !== undefined) base.requestId = fields.requestId;
      if (fields.route !== undefined) base.route = fields.route;
      if (fields.method !== undefined) base.method = fields.method;
      if (fields.status !== undefined) base.status = fields.status;
      if (fields.durationMs !== undefined) base.durationMs = fields.durationMs;
      if (fields.cacheHit !== undefined) base.cacheHit = fields.cacheHit;
      if (fields.provider !== undefined) base.provider = fields.provider;
      if (fields.context !== undefined) base.context = scrub(fields.context);
    }
    sink(JSON.stringify(base));
  };

  return {
    log: emit,
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    fatal: (m, f) => emit("fatal", m, f),
  };
}

/** Process-wide default logger. */
export const logger: Logger = createLogger();

/**
 * Read an incoming `x-request-id` header or generate a fresh uuid.
 * Accepts a Headers instance or a plain header map.
 */
export function getRequestId(
  headers: Headers | Record<string, string | undefined>,
): string {
  const incoming =
    headers instanceof Headers
      ? headers.get("x-request-id")
      : headers["x-request-id"];
  if (incoming && incoming.trim().length > 0) {
    return incoming.trim();
  }
  return crypto.randomUUID();
}

export type RequestLogResult = {
  readonly status: number;
  readonly cacheHit?: boolean;
};

/**
 * Wrap a route handler: derive a requestId, time the handler, log one
 * structured line on completion, and echo `x-request-id` on the response.
 */
export async function withRequestLogging(
  request: Request,
  route: string,
  handler: (requestId: string) => Promise<Response>,
  log: Logger = logger,
): Promise<Response> {
  const requestId = getRequestId(request.headers);
  const method = request.method;
  const start = Date.now();
  let status = 500;
  try {
    const response = await handler(requestId);
    status = response.status;
    response.headers.set("x-request-id", requestId);
    log.info("request.complete", {
      requestId,
      route,
      method,
      status,
      durationMs: Date.now() - start,
    });
    return response;
  } catch (error) {
    log.error("request.failed", {
      requestId,
      route,
      method,
      status,
      durationMs: Date.now() - start,
      context: { error: error instanceof Error ? error.message : "unknown" },
    });
    throw error;
  }
}

/**
 * Time a provider call, recording latency + status, and emit a `warn`
 * fair-use/slowness signal if it exceeds {@link SLOW_PROVIDER_MS}.
 */
export async function timeProvider<T>(
  provider: string,
  requestId: string,
  call: () => Promise<T>,
  log: Logger = logger,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await call();
    const durationMs = Date.now() - start;
    const level: LogLevel = durationMs > SLOW_PROVIDER_MS ? "warn" : "debug";
    log.log(level, "provider.call", {
      requestId,
      provider,
      status: 200,
      durationMs,
    });
    return result;
  } catch (error) {
    const durationMs = Date.now() - start;
    log.warn("provider.error", {
      requestId,
      provider,
      status: 502,
      durationMs,
      context: { error: error instanceof Error ? error.message : "unknown" },
    });
    throw error;
  }
}

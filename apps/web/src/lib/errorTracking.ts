/**
 * SDK-agnostic error tracking with mandatory PII scrubbing.
 *
 * Local/dev is a NO-OP transport (no DSN configured). A Sentry-compatible
 * client can be slotted in by providing a `transport`. We do NOT depend on a
 * paid SDK here.
 *
 * NOTE: A live DSN and source-map upload are deploy-gated and out of scope.
 * Wiring a real transport + release artifacts is a deployment concern.
 */

export type ErrorContext = Readonly<Record<string, unknown>>;

export type TrackedEvent = {
  readonly message: string;
  readonly name?: string;
  readonly stack?: string;
  readonly context?: ErrorContext;
  readonly tags: {
    readonly appVersion: string;
    readonly platform: "web";
    readonly connectivity: "online" | "offline";
  };
};

/** Transport receives a fully-scrubbed event. */
export type Transport = (event: TrackedEvent) => void;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER_RE = /\b[Bb]earer\s+[A-Za-z0-9._\-+/=]+/g;
const JWT_RE = /\beyJ[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+/g;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
// Decimal numbers within plausible coordinate range, rounded to 2dp.
const COORD_RE = /-?\d{1,3}\.\d{3,}/g;

function roundCoordToken(token: string): string {
  const n = Number(token);
  if (!Number.isFinite(n) || n < -180 || n > 180) {
    return token;
  }
  return (Math.round(n * 100) / 100).toString();
}

function scrubString(value: string): string {
  return value
    .replace(JWT_RE, "[redacted]")
    .replace(BEARER_RE, "[redacted]")
    .replace(EMAIL_RE, "[redacted]")
    .replace(IPV4_RE, "[redacted]")
    .replace(COORD_RE, roundCoordToken);
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (typeof value === "number") {
    if (Number.isFinite(value) && !Number.isInteger(value) && value >= -180 && value <= 180) {
      return Math.round(value * 100) / 100;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = scrubValue(v);
    }
    return out;
  }
  return value;
}

/**
 * Mandatory scrub applied before any event leaves the process.
 * Throws on malformed input so the caller can FAIL CLOSED (drop the event).
 */
function beforeSend(event: TrackedEvent): TrackedEvent {
  const scrubbedContext =
    event.context === undefined
      ? undefined
      : (scrubValue(event.context) as ErrorContext);
  return {
    ...event,
    message: scrubString(event.message),
    stack: event.stack === undefined ? undefined : scrubString(event.stack),
    context: scrubbedContext,
  };
}

function appVersion(): string {
  return (
    process.env.NEXT_PUBLIC_APP_VERSION ??
    process.env.npm_package_version ??
    "0.0.0"
  );
}

function connectivity(): "online" | "offline" {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine ? "online" : "offline";
  }
  return "online";
}

const noopTransport: Transport = () => {
  // No DSN configured: drop silently. Kept pluggable for a real client.
};

type State = {
  enabled: boolean;
  transport: Transport;
};

const state: State = {
  enabled: false,
  transport: noopTransport,
};

/**
 * Initialize error tracking. Without `ERROR_TRACKING_DSN` (or an explicit
 * transport) this is a NO-OP transport, so local development is unaffected.
 */
export function init(options?: { transport?: Transport }): void {
  const dsn = process.env.ERROR_TRACKING_DSN;
  if (options?.transport) {
    state.transport = options.transport;
    state.enabled = true;
    return;
  }
  if (dsn && dsn.trim().length > 0) {
    // A real Sentry-compatible client would be constructed here from the DSN.
    state.enabled = true;
    state.transport = noopTransport;
    return;
  }
  state.enabled = false;
  state.transport = noopTransport;
}

/**
 * Capture an exception. Always tags appVersion/platform/connectivity and
 * runs the mandatory scrub. If scrubbing throws, the event is DROPPED.
 */
export function captureException(err: unknown, context?: ErrorContext): void {
  const raw: TrackedEvent = {
    message: err instanceof Error ? err.message : String(err),
    name: err instanceof Error ? err.name : undefined,
    stack: err instanceof Error ? err.stack : undefined,
    context,
    tags: {
      appVersion: appVersion(),
      platform: "web",
      connectivity: connectivity(),
    },
  };

  let safe: TrackedEvent;
  try {
    safe = beforeSend(raw);
  } catch {
    // Fail closed: never send an event we could not fully scrub.
    return;
  }

  if (!state.enabled) {
    return;
  }
  state.transport(safe);
}

/** Test/runtime helper to reset module state. */
export function _reset(): void {
  state.enabled = false;
  state.transport = noopTransport;
}

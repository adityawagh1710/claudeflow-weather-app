/**
 * Opt-in, privacy-preserving product analytics.
 *
 * Emits anonymized AGGREGATE events only. No user id, no precise location,
 * no search terms. A rotating anonymous install id (rotated monthly) is the
 * only identifier, and it is random + local.
 *
 * `track()` is a strict NO-OP unless analytics is explicitly opted in AND the
 * browser does not signal Do-Not-Track / Global Privacy Control.
 */

export type AnalyticsEvent =
  | "location_searched"
  | "favorite_added"
  | "favorite_removed"
  | "unit_toggled"
  | "theme_changed"
  | "offline_render";

/**
 * Allowed payload keys per event. Anything not whitelisted is stripped so we
 * can NEVER accidentally emit query text, coordinates, or user identifiers.
 */
const PAYLOAD_WHITELIST: Readonly<Record<AnalyticsEvent, ReadonlyArray<string>>> = {
  location_searched: [],
  favorite_added: [],
  favorite_removed: [],
  unit_toggled: ["unit", "value"],
  theme_changed: ["theme"],
  offline_render: [],
};

export type AnalyticsPayload = Readonly<Record<string, string>>;

export type AnalyticsRecord = {
  readonly event: AnalyticsEvent;
  readonly installId: string;
  readonly payload: AnalyticsPayload;
  readonly ts: string;
};

const INSTALL_ID_KEY = "weather-analytics-install";
const ROTATE_MS = 30 * 24 * 60 * 60 * 1000; // ~monthly

type InstallRecord = {
  readonly id: string;
  readonly createdAt: number;
};

function readInstall(): InstallRecord | null {
  try {
    const raw = window.localStorage.getItem(INSTALL_ID_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<InstallRecord>;
    if (typeof parsed.id === "string" && typeof parsed.createdAt === "number") {
      return { id: parsed.id, createdAt: parsed.createdAt };
    }
    return null;
  } catch {
    return null;
  }
}

function writeInstall(record: InstallRecord): void {
  try {
    window.localStorage.setItem(INSTALL_ID_KEY, JSON.stringify(record));
  } catch {
    // Ignore persistence failures (private mode, quota, etc.).
  }
}

/**
 * Get the current rotating anonymous install id, rotating it if older than
 * the rotation window. Random + local; never tied to a user.
 */
export function getInstallId(now: number = Date.now()): string {
  if (typeof window === "undefined") {
    return "ssr";
  }
  const existing = readInstall();
  if (existing && now - existing.createdAt < ROTATE_MS) {
    return existing.id;
  }
  const fresh: InstallRecord = { id: crypto.randomUUID(), createdAt: now };
  writeInstall(fresh);
  return fresh.id;
}

/** True only when the browser does not signal DNT / GPC. */
export function trackingAllowedByBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
  };
  if (nav.doNotTrack === "1") {
    return false;
  }
  if (nav.globalPrivacyControl === true) {
    return false;
  }
  return true;
}

export type AnalyticsTransport = (record: AnalyticsRecord) => void;

const defaultTransport: AnalyticsTransport = (record) => {
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      navigator.sendBeacon("/api/analytics", JSON.stringify(record));
    } catch {
      // Best-effort; analytics must never break the app.
    }
  }
};

type AnalyticsState = {
  optedIn: boolean;
  transport: AnalyticsTransport;
};

const state: AnalyticsState = {
  optedIn: false,
  transport: defaultTransport,
};

/** Opt-in state is owned by preferences; mirror it here for `track()`. */
export function setAnalyticsOptIn(optedIn: boolean): void {
  state.optedIn = optedIn;
}

/** Override the transport (tests, or a real analytics sink). */
export function setAnalyticsTransport(transport: AnalyticsTransport): void {
  state.transport = transport;
}

function sanitizePayload(
  event: AnalyticsEvent,
  payload: AnalyticsPayload | undefined,
): AnalyticsPayload {
  if (!payload) {
    return {};
  }
  const allowed = PAYLOAD_WHITELIST[event];
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const value = payload[key];
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Record an anonymized aggregate event. NO-OP unless opted in and the
 * browser does not signal DNT/GPC. Payload keys are whitelisted per event,
 * so query text / coordinates / identifiers can never leak.
 */
export function track(event: AnalyticsEvent, payload?: AnalyticsPayload): void {
  if (!state.optedIn) {
    return;
  }
  if (!trackingAllowedByBrowser()) {
    return;
  }
  const record: AnalyticsRecord = {
    event,
    installId: getInstallId(),
    payload: sanitizePayload(event, payload),
    ts: new Date().toISOString(),
  };
  try {
    state.transport(record);
  } catch {
    // Analytics failures are non-fatal.
  }
}

/** Test helper. */
export function _reset(): void {
  state.optedIn = false;
  state.transport = defaultTransport;
}

import {
  ValidationError,
  type TempUnit,
  type WindUnit,
  type TimeFormat,
  type Theme,
} from "@/lib/types";

export function parseLatLon(searchParams: URLSearchParams): {
  lat: number;
  lon: number;
} {
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");
  if (latRaw === null || lonRaw === null) {
    throw new ValidationError("lat and lon are required");
  }
  const lat = Number(latRaw);
  const lon = Number(lonRaw);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new ValidationError("lat must be a number in [-90, 90]");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new ValidationError("lon must be a number in [-180, 180]");
  }
  return { lat, lon };
}

export function parseQuery(q: string | null): string {
  if (q === null) {
    throw new ValidationError("q is required");
  }
  const trimmed = q.trim();
  if (trimmed.length < 1) {
    throw new ValidationError("q must not be empty");
  }
  if (trimmed.length > 100) {
    throw new ValidationError("q must be at most 100 characters");
  }
  return trimmed;
}

const TEMP_UNITS: ReadonlyArray<TempUnit> = ["celsius", "fahrenheit"];
const WIND_UNITS: ReadonlyArray<WindUnit> = ["kmh", "mph"];
const TIME_FORMATS: ReadonlyArray<TimeFormat> = ["12h", "24h"];
const THEMES: ReadonlyArray<Theme> = ["light", "dark", "system"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Latitude in [-90, 90]. */
export function parseLatitude(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < -90 || n > 90) {
    throw new ValidationError("latitude must be a number in [-90, 90]");
  }
  return n;
}

/** Longitude in [-180, 180]. */
export function parseLongitude(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < -180 || n > 180) {
    throw new ValidationError("longitude must be a number in [-180, 180]");
  }
  return n;
}

/** Bounded, trimmed, non-empty text field. */
export function parseTextField(
  value: unknown,
  field: string,
  maxLength = 200,
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < 1) {
    throw new ValidationError(`${field} must not be empty`);
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function parseOptionalText(
  value: unknown,
  field: string,
  maxLength = 200,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return parseTextField(value, field, maxLength);
}

export type FavoriteInput = {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country?: string;
  readonly admin1?: string;
  readonly sortOrder?: number;
};

/** Validate a create-favorite payload from an untrusted request body. */
export function parseFavoriteInput(body: unknown): FavoriteInput {
  if (!isRecord(body)) {
    throw new ValidationError("request body must be a JSON object");
  }
  const sortOrderRaw = body.sortOrder ?? body.sort_order;
  let sortOrder: number | undefined;
  if (sortOrderRaw !== undefined && sortOrderRaw !== null) {
    const n = Number(sortOrderRaw);
    if (!Number.isInteger(n) || n < 0) {
      throw new ValidationError("sortOrder must be a non-negative integer");
    }
    sortOrder = n;
  }
  return {
    name: parseTextField(body.name, "name"),
    latitude: parseLatitude(body.latitude),
    longitude: parseLongitude(body.longitude),
    country: parseOptionalText(body.country, "country"),
    admin1: parseOptionalText(body.admin1, "admin1"),
    sortOrder,
  };
}

export type FavoriteUpdate = {
  readonly name?: string;
  readonly sortOrder?: number;
};

/** Validate a PATCH (rename / reorder) payload; at least one field required. */
export function parseFavoriteUpdate(body: unknown): FavoriteUpdate {
  if (!isRecord(body)) {
    throw new ValidationError("request body must be a JSON object");
  }
  const update: { name?: string; sortOrder?: number } = {};
  if (body.name !== undefined) {
    update.name = parseTextField(body.name, "name");
  }
  const sortOrderRaw = body.sortOrder ?? body.sort_order;
  if (sortOrderRaw !== undefined && sortOrderRaw !== null) {
    const n = Number(sortOrderRaw);
    if (!Number.isInteger(n) || n < 0) {
      throw new ValidationError("sortOrder must be a non-negative integer");
    }
    update.sortOrder = n;
  }
  if (update.name === undefined && update.sortOrder === undefined) {
    throw new ValidationError("at least one of name or sortOrder is required");
  }
  return update;
}

export type PreferencesInput = {
  readonly tempUnit: TempUnit;
  readonly windUnit: WindUnit;
  readonly timeFormat: TimeFormat;
  readonly theme: Theme;
};

function parseEnum<T extends string>(
  value: unknown,
  allowed: ReadonlyArray<T>,
  field: string,
): T {
  if (typeof value === "string" && (allowed as ReadonlyArray<string>).includes(value)) {
    return value as T;
  }
  throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
}

/** Validate a full preferences upsert payload (all enums required). */
export function parsePreferencesInput(body: unknown): PreferencesInput {
  if (!isRecord(body)) {
    throw new ValidationError("request body must be a JSON object");
  }
  return {
    tempUnit: parseEnum(
      body.tempUnit ?? body.temp_unit,
      TEMP_UNITS,
      "tempUnit",
    ),
    windUnit: parseEnum(
      body.windUnit ?? body.wind_unit,
      WIND_UNITS,
      "windUnit",
    ),
    timeFormat: parseEnum(
      body.timeFormat ?? body.time_format,
      TIME_FORMATS,
      "timeFormat",
    ),
    theme: parseEnum(body.theme, THEMES, "theme"),
  };
}

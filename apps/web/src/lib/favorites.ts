/**
 * Favorite / preference row shapes and pure mappers between the Postgres
 * column casing (snake_case, per Spec §3) and the camelCase API/UI shape.
 *
 * These helpers are intentionally pure so they are unit-testable and counted
 * in the lib coverage gate. The actual Supabase queries live in the route
 * handlers using `getServerClient(token)`.
 */

import type {
  TempUnit,
  WindUnit,
  TimeFormat,
  Theme,
} from "@/lib/types";
import type { FavoriteInput, PreferencesInput } from "@/lib/validation";

/** A favorite as returned to API clients. */
export type Favorite = {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country: string | null;
  readonly admin1: string | null;
  readonly sortOrder: number;
  readonly createdAt: string;
};

/** A favorite row as stored in Postgres (snake_case columns). */
export type FavoriteRow = {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country: string | null;
  readonly admin1: string | null;
  readonly sort_order: number;
  readonly created_at: string;
};

/** Map a DB row to the API shape. */
export function toFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    country: row.country,
    admin1: row.admin1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function toFavorites(rows: ReadonlyArray<FavoriteRow>): Favorite[] {
  return rows.map(toFavorite);
}

/** Build the insert payload (snake_case) for a validated favorite + owner. */
export function toFavoriteInsert(
  input: FavoriteInput,
  userId: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    country: input.country ?? null,
    admin1: input.admin1 ?? null,
    sort_order: input.sortOrder ?? 0,
  };
}

/** Build a partial update payload (snake_case) from a validated patch. */
export function toFavoriteUpdate(patch: {
  readonly name?: string;
  readonly sortOrder?: number;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    out.name = patch.name;
  }
  if (patch.sortOrder !== undefined) {
    out.sort_order = patch.sortOrder;
  }
  return out;
}

/** Preferences as returned to API clients. */
export type Preferences = {
  readonly tempUnit: TempUnit;
  readonly windUnit: WindUnit;
  readonly timeFormat: TimeFormat;
  readonly theme: Theme;
  readonly updatedAt: string;
};

/** Preferences row as stored in Postgres (snake_case columns). */
export type PreferencesRow = {
  readonly user_id: string;
  readonly temp_unit: TempUnit;
  readonly wind_unit: WindUnit;
  readonly time_format: TimeFormat;
  readonly theme: Theme;
  readonly updated_at: string;
};

export function toPreferences(row: PreferencesRow): Preferences {
  return {
    tempUnit: row.temp_unit,
    windUnit: row.wind_unit,
    timeFormat: row.time_format,
    theme: row.theme,
    updatedAt: row.updated_at,
  };
}

/** Build the upsert payload (snake_case) for validated preferences + owner. */
export function toPreferencesUpsert(
  input: PreferencesInput,
  userId: string,
): Record<string, unknown> {
  return {
    user_id: userId,
    temp_unit: input.tempUnit,
    wind_unit: input.windUnit,
    time_format: input.timeFormat,
    theme: input.theme,
    updated_at: new Date().toISOString(),
  };
}

/** Postgres unique-violation code (favorites unique(user_id, lat, lon)). */
export const PG_UNIQUE_VIOLATION = "23505";

/** Narrow a Supabase/Postgres error to detect the unique-constraint case. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

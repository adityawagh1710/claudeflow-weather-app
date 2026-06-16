/**
 * Local (signed-out / unconfigured) favorites store.
 *
 * When the user is signed out or Supabase is not configured, favorites are
 * kept in localStorage so the feature still works (Spec §6 FR-6 degrades
 * gracefully). Pure read/write/mutate helpers live here so they are testable
 * and counted in the lib coverage gate; the hook layer wires them to React.
 *
 * NOTE: true cross-device sync requires a live Supabase project and is
 * deferred to runtime verification against a real backend.
 */

import type { Favorite } from "@/lib/favorites";

export const LOCAL_FAVORITES_KEY = "weather-favorites";

/** A local favorite uses the same shape as a remote one; id is client-gen. */
export type LocalFavoriteInput = {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly country?: string | null;
  readonly admin1?: string | null;
};

function sortByOrder(list: ReadonlyArray<Favorite>): Favorite[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Parse a raw localStorage payload into a sorted favorites list. */
export function parseLocalFavorites(raw: string | null): Favorite[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const valid = parsed.filter(
      (f): f is Favorite =>
        typeof f === "object" &&
        f !== null &&
        typeof (f as Favorite).id === "string" &&
        typeof (f as Favorite).latitude === "number" &&
        typeof (f as Favorite).longitude === "number",
    );
    return sortByOrder(valid);
  } catch {
    return [];
  }
}

function sameLocation(a: Favorite, input: LocalFavoriteInput): boolean {
  return a.latitude === input.latitude && a.longitude === input.longitude;
}

/** Add a favorite immutably; de-dupes on (lat, lon) per the unique rule. */
export function addLocalFavorite(
  list: ReadonlyArray<Favorite>,
  input: LocalFavoriteInput,
  id: string,
  now: string,
): Favorite[] {
  if (list.some((f) => sameLocation(f, input))) {
    return sortByOrder(list);
  }
  const nextOrder =
    list.reduce((max, f) => Math.max(max, f.sortOrder), -1) + 1;
  const created: Favorite = {
    id,
    name: input.name,
    latitude: input.latitude,
    longitude: input.longitude,
    country: input.country ?? null,
    admin1: input.admin1 ?? null,
    sortOrder: nextOrder,
    createdAt: now,
  };
  return sortByOrder([...list, created]);
}

/** Remove a favorite by id (immutable). */
export function removeLocalFavorite(
  list: ReadonlyArray<Favorite>,
  id: string,
): Favorite[] {
  return sortByOrder(list.filter((f) => f.id !== id));
}

/** Reorder by moving `id` to `targetOrder`, renumbering sequentially. */
export function reorderLocalFavorites(
  list: ReadonlyArray<Favorite>,
  id: string,
  targetIndex: number,
): Favorite[] {
  const ordered = sortByOrder(list);
  const fromIndex = ordered.findIndex((f) => f.id === id);
  if (fromIndex === -1) {
    return ordered;
  }
  const clamped = Math.max(0, Math.min(targetIndex, ordered.length - 1));
  const without = ordered.filter((f) => f.id !== id);
  const moved = ordered[fromIndex];
  without.splice(clamped, 0, moved);
  return without.map((f, idx) => ({ ...f, sortOrder: idx }));
}

/** Rename a favorite by id (immutable). */
export function renameLocalFavorite(
  list: ReadonlyArray<Favorite>,
  id: string,
  name: string,
): Favorite[] {
  return sortByOrder(
    list.map((f) => (f.id === id ? { ...f, name } : f)),
  );
}

/**
 * Thin fetch wrappers for the auth-required favorites/prefs routes.
 *
 * All calls attach the Supabase access token as a Bearer header. These are
 * pure functions (no React) so they can be reused and unit-tested.
 */

import type { Favorite } from "@/lib/favorites";
import type { Preferences } from "@/lib/favorites";
import type { FavoriteInput, PreferencesInput } from "@/lib/validation";

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${res.status})`;
}

export async function fetchFavorites(token: string): Promise<Favorite[]> {
  const res = await fetch("/api/favorites", {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body = (await res.json()) as { favorites: Favorite[] };
  return body.favorites;
}

export async function createFavorite(
  token: string,
  input: FavoriteInput,
): Promise<Favorite> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body = (await res.json()) as { favorite: Favorite };
  return body.favorite;
}

export async function patchFavorite(
  token: string,
  id: string,
  patch: { name?: string; sortOrder?: number },
): Promise<Favorite> {
  const res = await fetch(`/api/favorites/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body = (await res.json()) as { favorite: Favorite };
  return body.favorite;
}

export async function deleteFavorite(token: string, id: string): Promise<void> {
  const res = await fetch(`/api/favorites/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
}

export async function fetchPreferences(
  token: string,
): Promise<Preferences | null> {
  const res = await fetch("/api/prefs", { headers: authHeaders(token) });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body = (await res.json()) as { preferences: Preferences | null };
  return body.preferences;
}

export async function putPreferences(
  token: string,
  input: PreferencesInput,
): Promise<Preferences> {
  const res = await fetch("/api/prefs", {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  const body = (await res.json()) as { preferences: Preferences };
  return body.preferences;
}

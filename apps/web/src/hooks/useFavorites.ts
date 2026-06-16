"use client";

/**
 * Favorites with backend sync when signed in, localStorage fallback otherwise.
 *
 * - Signed in (token present): mutations hit the API via TanStack Query with
 *   optimistic updates + rollback on error (Spec §patterns).
 * - Signed out / Supabase unconfigured: favorites persist in localStorage.
 *
 * NOTE: true cross-device sync verification requires a live Supabase project
 * and is deferred to runtime verification against a real backend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Favorite } from "@/lib/favorites";
import {
  createFavorite,
  deleteFavorite,
  fetchFavorites,
  patchFavorite,
} from "@/lib/favoritesApi";
import {
  LOCAL_FAVORITES_KEY,
  addLocalFavorite,
  parseLocalFavorites,
  removeLocalFavorite,
  reorderLocalFavorites,
  type LocalFavoriteInput,
} from "@/lib/localFavorites";

export type AddFavoriteInput = LocalFavoriteInput;

export type FavoritesApi = {
  readonly favorites: Favorite[];
  readonly loading: boolean;
  readonly error: string | null;
  add(input: AddFavoriteInput): void;
  remove(id: string): void;
  reorder(id: string, targetIndex: number): void;
};

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readLocal(): Favorite[] {
  if (typeof window === "undefined") return [];
  return parseLocalFavorites(window.localStorage.getItem(LOCAL_FAVORITES_KEY));
}

function writeLocal(list: ReadonlyArray<Favorite>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // ignore persistence failures (private mode / quota)
  }
}

function useLocalFavorites(): FavoritesApi {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  useEffect(() => {
    setFavorites(readLocal());
  }, []);

  const apply = useCallback((next: Favorite[]) => {
    writeLocal(next);
    setFavorites(next);
  }, []);

  return {
    favorites,
    loading: false,
    error: null,
    add: (input) =>
      apply(addLocalFavorite(favorites, input, genId(), new Date().toISOString())),
    remove: (id) => apply(removeLocalFavorite(favorites, id)),
    reorder: (id, targetIndex) =>
      apply(reorderLocalFavorites(favorites, id, targetIndex)),
  };
}

const QUERY_KEY = ["favorites"] as const;

function useRemoteFavorites(token: string): FavoritesApi {
  const qc = useQueryClient();
  const key = useMemo(() => [...QUERY_KEY, token], [token]);
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchFavorites(token),
    enabled: token.length > 0,
  });
  const current = query.data ?? [];

  const addMutation = useMutation({
    mutationFn: (input: AddFavoriteInput) =>
      createFavorite(token, {
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        country: input.country ?? undefined,
        admin1: input.admin1 ?? undefined,
      }),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Favorite[]>(key) ?? [];
      const optimistic = addLocalFavorite(
        prev,
        input,
        `optimistic-${genId()}`,
        new Date().toISOString(),
      );
      qc.setQueryData(key, optimistic);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteFavorite(token, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Favorite[]>(key) ?? [];
      qc.setQueryData(key, removeLocalFavorite(prev, id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const reorderMutation = useMutation({
    mutationFn: (vars: { id: string; targetIndex: number }) =>
      patchFavorite(token, vars.id, { sortOrder: vars.targetIndex }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Favorite[]>(key) ?? [];
      qc.setQueryData(
        key,
        reorderLocalFavorites(prev, vars.id, vars.targetIndex),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    favorites: current,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    add: (input) => addMutation.mutate(input),
    remove: (id) => removeMutation.mutate(id),
    reorder: (id, targetIndex) => reorderMutation.mutate({ id, targetIndex }),
  };
}

/**
 * Public hook: picks the remote-synced or local-only implementation based on
 * whether an access token is available. Hooks for both paths are always called
 * (rules-of-hooks safe); only the selected result is returned.
 */
export function useFavorites(token: string | null): FavoritesApi {
  const local = useLocalFavorites();
  const remote = useRemoteFavorites(token ?? "");
  // When no token, the remote query is still mounted but unused; we return the
  // local store. (Selecting by token keeps hook order stable across renders.)
  return useMemo(
    () => (token ? remote : local),
    [token, remote, local],
  );
}

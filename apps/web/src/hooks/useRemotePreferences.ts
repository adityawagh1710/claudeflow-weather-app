"use client";

/**
 * Remote preferences sync (TanStack Query).
 *
 * When signed in, reads/writes preferences via /api/prefs. When signed out or
 * Supabase is unconfigured, this is a no-op and the caller keeps using the
 * localStorage-backed `usePreferences` (prefs are already local-first).
 *
 * NOTE: cross-device preference sync is only verifiable against a live
 * Supabase project (runtime verification deferred).
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Preferences } from "@/lib/favorites";
import type { PreferencesInput } from "@/lib/validation";
import { fetchPreferences, putPreferences } from "@/lib/favoritesApi";

export type RemotePreferencesApi = {
  readonly preferences: Preferences | null;
  readonly loading: boolean;
  readonly error: string | null;
  save(input: PreferencesInput): Promise<Preferences | null>;
};

const QUERY_KEY = ["preferences"] as const;

export function useRemotePreferences(token: string | null): RemotePreferencesApi {
  const qc = useQueryClient();
  const enabled = Boolean(token);
  const key = [...QUERY_KEY, token ?? ""];

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPreferences(token as string),
    enabled,
  });

  const mutation = useMutation({
    mutationFn: (input: PreferencesInput) =>
      putPreferences(token as string, input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Preferences | null>(key) ?? null;
      const optimistic: Preferences = {
        ...input,
        updatedAt: new Date().toISOString(),
      };
      qc.setQueryData(key, optimistic);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const save = useCallback(
    async (input: PreferencesInput): Promise<Preferences | null> => {
      if (!token) {
        return null;
      }
      return mutation.mutateAsync(input);
    },
    [token, mutation],
  );

  return {
    preferences: query.data ?? null,
    loading: query.isLoading && enabled,
    error: query.error instanceof Error ? query.error.message : null,
    save,
  };
}

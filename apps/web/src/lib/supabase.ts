/**
 * Supabase client factories.
 *
 * The app must build and run with NO Supabase env configured (signed-out
 * weather browsing still works). Therefore every entry point is guarded by
 * {@link isSupabaseConfigured}; factories throw a clear, typed error when the
 * required env is missing rather than producing a half-initialised client.
 *
 * SECURITY: the service-role key is read ONLY inside server factories and is
 * never referenced from a client component. NEXT_PUBLIC_* values are safe to
 * ship in the browser bundle; SUPABASE_SERVICE_ROLE_KEY must never be.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

function browserUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function anonKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function serviceRoleKey(): string | undefined {
  const v = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * True when the public URL + anon key are present. Callers (UI, hooks, routes)
 * use this to degrade gracefully when Supabase is not configured.
 */
export function isSupabaseConfigured(): boolean {
  return browserUrl() !== undefined && anonKey() !== undefined;
}

/**
 * Browser/anon client for use in client components and auth flows.
 * Throws {@link SupabaseConfigError} when env is missing — guard with
 * {@link isSupabaseConfigured} first.
 */
export function getBrowserClient(): SupabaseClient {
  const url = browserUrl();
  const key = anonKey();
  if (!url || !key) {
    throw new SupabaseConfigError(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Server-side client. When `accessToken` is supplied the request runs as that
 * user (RLS enforced via the JWT). Without a token it falls back to the
 * service-role key when available — used only for trusted server operations.
 *
 * Throws {@link SupabaseConfigError} when env is missing.
 */
export function getServerClient(accessToken?: string): SupabaseClient {
  const url = browserUrl();
  const anon = anonKey();
  if (!url || !anon) {
    throw new SupabaseConfigError(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  if (accessToken) {
    // Per-request user-scoped client: RLS applies via the caller's JWT.
    return createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  // No user token: use the service-role key for trusted server work (e.g.
  // token verification). This key is server-only and never bundled client-side.
  const service = serviceRoleKey() ?? anon;
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

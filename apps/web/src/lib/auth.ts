/**
 * Server-side auth helpers for the auth-required API routes.
 *
 * `verifyAccessToken` validates a Supabase JWT by asking Supabase who the
 * token belongs to (auth.getUser) and returns the user id, or null when the
 * token is missing/invalid. `getBearerToken` extracts the raw token from an
 * Authorization header.
 *
 * RLS is the source of truth for row ownership; verifying the token here lets
 * us fail fast with 401 before touching the database (defense in depth).
 */

import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";

/** Extract the bearer token from request headers, or null when absent. */
export function getBearerToken(
  headers: Headers | Record<string, string | undefined>,
): string | null {
  const raw =
    headers instanceof Headers
      ? headers.get("authorization")
      : (headers["authorization"] ?? headers["Authorization"]);
  if (!raw) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match) {
    return null;
  }
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Validate a Supabase access token and return the authenticated user id.
 * Returns null when Supabase is unconfigured, the token is empty, or the
 * token is rejected by Supabase.
 *
 * NOTE: real JWT acceptance can only be verified against a live Supabase
 * project (runtime verification deferred); this is exercised here via a
 * mocked Supabase client in the integration tests.
 */
export async function verifyAccessToken(
  token: string | null,
): Promise<string | null> {
  if (!token || !isSupabaseConfigured()) {
    return null;
  }
  try {
    const client = getServerClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user.id;
  } catch {
    return null;
  }
}

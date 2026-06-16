"use client";

/**
 * Client auth hook over Supabase Auth.
 *
 * When Supabase is NOT configured, this returns a disabled state: user is
 * null and every method resolves with a clear error WITHOUT throwing, so
 * signed-out weather browsing keeps working.
 *
 * NOTE: desktop OAuth via loopback / deep-link redirect (Spec §6 FR-1) is
 * deferred to the Tauri shell (Task 1.4 desktop portion). In the web build the
 * OAuth call uses the browser redirect flow; the desktop shell will override
 * `redirectTo` with its loopback/deep-link URL. Runtime OAuth verification
 * requires a live Supabase project and is deferred.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export type OAuthProvider = "google" | "github";

export type AuthResult = { ok: boolean; error?: string };

export type AuthApi = {
  readonly user: User | null;
  readonly session: Session | null;
  readonly accessToken: string | null;
  readonly loading: boolean;
  readonly configured: boolean;
  signInWithEmail(email: string, password: string): Promise<AuthResult>;
  signUpWithEmail(email: string, password: string): Promise<AuthResult>;
  signInWithOAuth(provider: OAuthProvider): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
};

const DISABLED_ERROR = "Sign-in is unavailable: Supabase is not configured";

function disabled(): AuthResult {
  return { ok: false, error: DISABLED_ERROR };
}

export function useAuth(): AuthApi {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);

  // Memoise the client so listeners aren't re-registered every render.
  const client = useMemo(
    () => (configured ? getBrowserClient() : null),
    [configured],
  );

  useEffect(() => {
    if (!client) {
      setLoading(false);
      return;
    }
    let active = true;
    client.auth
      .getSession()
      .then(({ data }) => {
        if (active) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!client) return disabled();
      const { error } = await client.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [client],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!client) return disabled();
      const { error } = await client.auth.signUp({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [client],
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider): Promise<AuthResult> => {
      if (!client) return disabled();
      // Desktop shell will override redirectTo with a loopback/deep-link URL.
      const { error } = await client.auth.signInWithOAuth({ provider });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    [client],
  );

  const signOut = useCallback(async (): Promise<AuthResult> => {
    if (!client) return disabled();
    const { error } = await client.auth.signOut();
    return error ? { ok: false, error: error.message } : { ok: true };
  }, [client]);

  return {
    user: session?.user ?? null,
    session,
    accessToken: session?.access_token ?? null,
    loading,
    configured,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
  };
}

"use client";

/**
 * Minimal auth UI: email sign in / sign up, one OAuth button, and sign out.
 *
 * Gated on `isSupabaseConfigured()` — when Supabase is not configured the
 * panel renders nothing so signed-out weather browsing is unaffected.
 *
 * NOTE: desktop OAuth (loopback/deep-link redirect) is handled by the Tauri
 * shell and verified at runtime against a live Supabase project (deferred).
 */

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { AuthApi } from "@/hooks/useAuth";

interface AuthPanelProps {
  auth: AuthApi;
}

export function AuthPanel({ auth }: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);

  // Hard gate: never render auth UI when Supabase is unconfigured.
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (auth.loading) {
    return (
      <div className="glass auth" role="status">
        Checking session…
      </div>
    );
  }

  if (auth.user) {
    return (
      <div className="glass auth auth-signedin">
        <span className="muted">Signed in as {auth.user.email ?? "you"}</span>
        <button
          type="button"
          className="btn"
          onClick={async () => {
            const r = await auth.signOut();
            if (!r.ok) setMessage(r.error ?? "Sign out failed");
          }}
        >
          Sign out
        </button>
        {message && (
          <p className="muted" role="alert">
            {message}
          </p>
        )}
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const r =
      mode === "signin"
        ? await auth.signInWithEmail(email, password)
        : await auth.signUpWithEmail(email, password);
    if (!r.ok) {
      setMessage(r.error ?? "Authentication failed");
    } else if (mode === "signup") {
      setMessage("Check your email to confirm your account.");
    }
  };

  return (
    <section className="glass auth" aria-labelledby="auth-heading">
      <h2 id="auth-heading" className="auth-title">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h2>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-label">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="auth-label">
          Password
          <input
            type="password"
            required
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary">
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        type="button"
        className="btn"
        onClick={async () => {
          const r = await auth.signInWithOAuth("google");
          if (!r.ok) setMessage(r.error ?? "OAuth failed");
        }}
      >
        Continue with Google
      </button>

      <button
        type="button"
        className="link-btn"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Have an account? Sign in"}
      </button>

      {message && (
        <p className="muted" role="alert">
          {message}
        </p>
      )}
    </section>
  );
}

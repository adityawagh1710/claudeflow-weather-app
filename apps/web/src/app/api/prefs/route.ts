/**
 * /api/prefs — read (GET) and upsert (PUT) the current user's preferences.
 *
 * Auth: requires a valid Supabase JWT in `Authorization: Bearer`. RLS keys
 * the preferences row on user_id = auth.uid() (defense in depth).
 *
 * Conflict policy is last-write-wins by updated_at (Spec §10). NOTE: live RLS
 * + cross-device sync is only verifiable against a real Supabase project
 * (runtime verification deferred); exercised here via a mocked client.
 */

import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getBearerToken, verifyAccessToken } from "@/lib/auth";
import { parsePreferencesInput } from "@/lib/validation";
import { ValidationError } from "@/lib/types";
import {
  toPreferences,
  toPreferencesUpsert,
  type PreferencesRow,
} from "@/lib/favorites";
import { logger, withRequestLogging } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { captureException } from "@/lib/errorTracking";

const ROUTE = "/api/prefs";

function unconfigured(): Response {
  return NextResponse.json(
    { error: "Supabase is not configured" },
    { status: 503 },
  );
}

export async function GET(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    let status = 200;
    try {
      if (!isSupabaseConfigured()) {
        status = 503;
        return unconfigured();
      }
      const token = getBearerToken(request.headers);
      const userId = await verifyAccessToken(token);
      if (!userId) {
        status = 401;
        return NextResponse.json({ error: "Unauthorized" }, { status });
      }
      const client = getServerClient(token ?? undefined);
      const { data, error } = await client
        .from("preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      const prefs = data ? toPreferences(data as PreferencesRow) : null;
      return NextResponse.json({ preferences: prefs });
    } catch (error) {
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("prefs.read_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to read preferences" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

export async function PUT(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    let status = 200;
    try {
      if (!isSupabaseConfigured()) {
        status = 503;
        return unconfigured();
      }
      const token = getBearerToken(request.headers);
      const userId = await verifyAccessToken(token);
      if (!userId) {
        status = 401;
        return NextResponse.json({ error: "Unauthorized" }, { status });
      }
      const body = (await request.json().catch(() => null)) as unknown;
      const input = parsePreferencesInput(body);
      const client = getServerClient(token ?? undefined);
      const { data, error } = await client
        .from("preferences")
        .upsert(toPreferencesUpsert(input, userId), { onConflict: "user_id" })
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      return NextResponse.json({
        preferences: toPreferences(data as PreferencesRow),
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        status = 400;
        return NextResponse.json({ error: error.message }, { status });
      }
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("prefs.upsert_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

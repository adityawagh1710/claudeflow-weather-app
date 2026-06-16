/**
 * /api/favorites — list (GET) and create (POST) the current user's favorites.
 *
 * Auth: requires a valid Supabase JWT in `Authorization: Bearer`. RLS on the
 * favorites table is the authoritative ownership guard; verifying the token
 * here lets us return 401 fast (defense in depth).
 *
 * NOTE: real RLS enforcement / cross-device behavior is only verifiable
 * against a live Supabase project (runtime verification deferred). These
 * handlers are exercised via a mocked Supabase client in the integration tests.
 */

import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getBearerToken, verifyAccessToken } from "@/lib/auth";
import { parseFavoriteInput } from "@/lib/validation";
import { ValidationError } from "@/lib/types";
import {
  toFavorites,
  toFavorite,
  toFavoriteInsert,
  isUniqueViolation,
  type FavoriteRow,
} from "@/lib/favorites";
import { logger, withRequestLogging } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { captureException } from "@/lib/errorTracking";

const ROUTE = "/api/favorites";

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
        .from("favorites")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true });
      if (error) {
        throw error;
      }
      const rows = (data ?? []) as FavoriteRow[];
      return NextResponse.json({ favorites: toFavorites(rows) });
    } catch (error) {
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("favorites.list_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to list favorites" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

export async function POST(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    let status = 201;
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
      const input = parseFavoriteInput(body);
      const client = getServerClient(token ?? undefined);
      const { data, error } = await client
        .from("favorites")
        .insert(toFavoriteInsert(input, userId))
        .select("*")
        .single();
      if (error) {
        if (isUniqueViolation(error)) {
          status = 409;
          return NextResponse.json(
            { error: "Favorite already exists for this location" },
            { status },
          );
        }
        throw error;
      }
      return NextResponse.json(
        { favorite: toFavorite(data as FavoriteRow) },
        { status },
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        status = 400;
        return NextResponse.json({ error: error.message }, { status });
      }
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("favorites.create_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to create favorite" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

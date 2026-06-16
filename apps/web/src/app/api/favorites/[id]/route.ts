/**
 * /api/favorites/:id — rename/reorder (PATCH) and remove (DELETE) a favorite.
 *
 * Auth: requires a valid Supabase JWT in `Authorization: Bearer`. The `.eq`
 * filters scope to the authenticated user, and RLS enforces ownership at the
 * row level (defense in depth).
 *
 * NOTE: real RLS enforcement is only verifiable against a live Supabase
 * project (runtime verification deferred); exercised here via a mocked client.
 */

import { NextResponse } from "next/server";
import { getServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getBearerToken, verifyAccessToken } from "@/lib/auth";
import { parseFavoriteUpdate } from "@/lib/validation";
import { ValidationError } from "@/lib/types";
import {
  toFavorite,
  toFavoriteUpdate,
  type FavoriteRow,
} from "@/lib/favorites";
import { logger, withRequestLogging } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { captureException } from "@/lib/errorTracking";

const ROUTE = "/api/favorites/[id]";

type Ctx = { params: Promise<{ id: string }> };

function unconfigured(): Response {
  return NextResponse.json(
    { error: "Supabase is not configured" },
    { status: 503 },
  );
}

export async function PATCH(request: Request, ctx: Ctx): Promise<Response> {
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
      const { id } = await ctx.params;
      const body = (await request.json().catch(() => null)) as unknown;
      const patch = parseFavoriteUpdate(body);
      const client = getServerClient(token ?? undefined);
      const { data, error } = await client
        .from("favorites")
        .update(toFavoriteUpdate(patch))
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      if (!data) {
        status = 404;
        return NextResponse.json({ error: "Favorite not found" }, { status });
      }
      return NextResponse.json({ favorite: toFavorite(data as FavoriteRow) });
    } catch (error) {
      if (error instanceof ValidationError) {
        status = 400;
        return NextResponse.json({ error: error.message }, { status });
      }
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("favorites.update_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to update favorite" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

export async function DELETE(request: Request, ctx: Ctx): Promise<Response> {
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
      const { id } = await ctx.params;
      const client = getServerClient(token ?? undefined);
      const { error } = await client
        .from("favorites")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        throw error;
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      logger.error("favorites.delete_failed", { requestId, route: ROUTE });
      return NextResponse.json(
        { error: "Failed to delete favorite" },
        { status },
      );
    } finally {
      metrics.recordRequest({ route: ROUTE, status, durationMs: Date.now() - start });
    }
  });
}

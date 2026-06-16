import { NextResponse } from "next/server";
import { geocode } from "@/lib/weatherClient";
import { parseQuery } from "@/lib/validation";
import { ProviderError, ValidationError } from "@/lib/types";
import { logger, timeProvider, withRequestLogging } from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { captureException } from "@/lib/errorTracking";

export const revalidate = 600;

const ROUTE = "/api/geocode";

export async function GET(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    const { searchParams } = new URL(request.url);
    let status = 200;
    try {
      const q = parseQuery(searchParams.get("q"));
      logger.debug("geocode.query", {
        requestId,
        route: ROUTE,
        context: { qLength: q.length },
      });
      const results = await timeProvider("open-meteo", requestId, () =>
        geocode(q),
      );
      return NextResponse.json({ results });
    } catch (error) {
      if (error instanceof ValidationError) {
        status = 400;
        return NextResponse.json({ error: error.message }, { status });
      }
      if (error instanceof ProviderError) {
        status = 502;
        return NextResponse.json({ error: error.message }, { status });
      }
      status = 500;
      captureException(error, { route: ROUTE, requestId });
      return NextResponse.json(
        { error: "Unexpected error during geocoding" },
        { status },
      );
    } finally {
      metrics.recordRequest({
        route: ROUTE,
        status,
        durationMs: Date.now() - start,
      });
    }
  });
}

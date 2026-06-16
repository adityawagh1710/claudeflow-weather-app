import { NextResponse } from "next/server";
import { getWeather } from "@/lib/weatherClient";
import { parseLatLon } from "@/lib/validation";
import { ProviderError, ValidationError } from "@/lib/types";
import {
  coarseCoord,
  logger,
  timeProvider,
  withRequestLogging,
} from "@/lib/logger";
import { metrics } from "@/lib/metrics";
import { captureException } from "@/lib/errorTracking";

export const revalidate = 600;

const ROUTE = "/api/weather";

export async function GET(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    const { searchParams } = new URL(request.url);
    let status = 200;
    try {
      const { lat, lon } = parseLatLon(searchParams);
      const name = searchParams.get("name") ?? undefined;
      logger.debug("weather.query", {
        requestId,
        route: ROUTE,
        context: { lat: coarseCoord(lat), lon: coarseCoord(lon) },
      });
      const snapshot = await timeProvider("open-meteo", requestId, () =>
        getWeather(lat, lon, name),
      );
      return NextResponse.json(snapshot);
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
        { error: "Unexpected error fetching weather" },
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

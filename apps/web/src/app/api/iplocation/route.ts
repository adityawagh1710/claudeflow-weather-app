import { NextResponse } from "next/server";
import { logger, timeProvider, withRequestLogging } from "@/lib/logger";
import { metrics } from "@/lib/metrics";

export const revalidate = 600;

const ROUTE = "/api/iplocation";

const DEFAULT_LOCATION = {
  latitude: 51.5072,
  longitude: -0.1276,
  name: "London",
};

type IpApiResponse = {
  latitude?: number;
  longitude?: number;
  city?: string;
  error?: boolean;
};

export async function GET(request: Request): Promise<Response> {
  const start = Date.now();
  return withRequestLogging(request, ROUTE, async (requestId) => {
    let status = 200;
    try {
      const data = await timeProvider<IpApiResponse | null>(
        "ipapi",
        requestId,
        async () => {
          const res = await fetch("https://ipapi.co/json/", {
            next: { revalidate: 600 },
          });
          if (!res.ok) {
            return null;
          }
          return (await res.json()) as IpApiResponse;
        },
      );

      if (
        !data ||
        data.error ||
        typeof data.latitude !== "number" ||
        typeof data.longitude !== "number"
      ) {
        return NextResponse.json(DEFAULT_LOCATION);
      }
      return NextResponse.json({
        latitude: data.latitude,
        longitude: data.longitude,
        name: data.city ?? "Current location",
      });
    } catch (error) {
      // IP location is best-effort: fall back to the default, never 500.
      logger.warn("iplocation.fallback", {
        requestId,
        route: ROUTE,
        context: { error: error instanceof Error ? error.message : "unknown" },
      });
      return NextResponse.json(DEFAULT_LOCATION);
    } finally {
      metrics.recordRequest({
        route: ROUTE,
        status,
        durationMs: Date.now() - start,
      });
    }
  });
}

import { NextResponse } from "next/server";
import { getRequestId, logger } from "@/lib/logger";

const ROUTE = "/api/analytics";

const EVENTS = [
  "location_searched",
  "favorite_added",
  "favorite_removed",
  "unit_toggled",
  "theme_changed",
  "offline_render",
] as const;

function isEvent(value: unknown): boolean {
  return typeof value === "string" && (EVENTS as ReadonlyArray<string>).includes(value);
}

type AnalyticsBody = {
  event?: unknown;
  payload?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  let body: AnalyticsBody;
  try {
    body = (await request.json()) as AnalyticsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isEvent(body.event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // Aggregate-only sink for now; logging stands in for a real analytics store.
  logger.info("analytics.event", {
    requestId,
    route: ROUTE,
    method: "POST",
    context: { event: body.event },
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}

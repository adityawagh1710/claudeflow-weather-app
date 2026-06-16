import { NextResponse } from "next/server";
import { getRequestId, logger } from "@/lib/logger";

const ROUTE = "/api/vitals";

const METRIC_NAMES = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const;
type MetricName = (typeof METRIC_NAMES)[number];

function isMetricName(value: unknown): value is MetricName {
  return (
    typeof value === "string" && (METRIC_NAMES as ReadonlyArray<string>).includes(value)
  );
}

type VitalPayload = {
  name?: unknown;
  value?: unknown;
  rating?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  const requestId = getRequestId(request.headers);
  let body: VitalPayload;
  try {
    body = (await request.json()) as VitalPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isMetricName(body.name)) {
    return NextResponse.json({ error: "Invalid metric name" }, { status: 400 });
  }
  if (typeof body.value !== "number" || !Number.isFinite(body.value)) {
    return NextResponse.json({ error: "Invalid metric value" }, { status: 400 });
  }

  // Logging is the sink for now; a real metrics backend is deploy-gated.
  logger.info("web-vital", {
    requestId,
    route: ROUTE,
    method: "POST",
    context: {
      name: body.name,
      value: body.value,
      rating: typeof body.rating === "string" ? body.rating : undefined,
    },
  });

  const response = NextResponse.json({ ok: true }, { status: 202 });
  response.headers.set("x-request-id", requestId);
  return response;
}

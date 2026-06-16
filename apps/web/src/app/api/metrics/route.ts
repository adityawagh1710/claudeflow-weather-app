import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

// NOTE: This returns an in-process RED snapshot and is a STOPGAP. Production
// would scrape/export these into a real TSDB (e.g. Prometheus) instead of
// reading a per-instance in-memory registry. Sync-health metrics are deferred
// until Supabase (Task 2.8).

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return NextResponse.json(metrics.snapshot());
}

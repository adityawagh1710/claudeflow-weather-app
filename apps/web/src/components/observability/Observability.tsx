"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";
import { captureException, init as initErrorTracking } from "@/lib/errorTracking";

function reportVital(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
  try {
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon("/api/vitals", body);
      if (ok) {
        return;
      }
    }
    void fetch("/api/vitals", {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/json" },
    });
  } catch {
    // Reporting is best-effort and must never break the page.
  }
}

/**
 * Client-side observability: reports Core Web Vitals to /api/vitals and wires
 * global error handlers into the scrubbing error tracker.
 */
export function Observability(): null {
  useEffect(() => {
    initErrorTracking();

    onLCP(reportVital);
    onINP(reportVital);
    onCLS(reportVital);
    onFCP(reportVital);
    onTTFB(reportVital);

    const onError = (event: ErrorEvent): void => {
      captureException(event.error ?? event.message, { kind: "window.error" });
    };
    const onRejection = (event: PromiseRejectionEvent): void => {
      captureException(event.reason, { kind: "unhandledrejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

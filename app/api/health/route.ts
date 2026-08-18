import { NextResponse } from "next/server";

import { getOrCreateCorrelationId, CORRELATION_ID_HEADER } from "@/lib/correlation-id";
import { withCorrelationId } from "@/lib/logger";

// Container/orchestrator health check. No dependencies to verify yet (no DB,
// no cache, nothing) — this is process-liveness only, mirroring why the
// spec doesn't ask for a separate readiness endpoint on manar-web.
export async function GET(request: Request) {
  const correlationId = getOrCreateCorrelationId(request.headers);
  const log = withCorrelationId(correlationId);

  log.info("health check requested");

  return NextResponse.json(
    {
      status: "ok",
      service: "manar-web",
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { [CORRELATION_ID_HEADER]: correlationId },
    },
  );
}

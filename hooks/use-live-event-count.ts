"use client";

import { useEffect, useRef, useState } from "react";

export type LiveConnectionStatus = "connecting" | "open" | "error";

export interface LiveEventCountState {
  count: number;
  status: LiveConnectionStatus;
}

/**
 * Subscribes to manar-api's tenant-scoped live audit event feed
 * (`GET /events/live`, Server-Sent Events) through the BFF proxy
 * (`/api/bff/events/live` — same auth-attaching code path as every other
 * generated-client call, see app/api/bff/[...path]/route.ts) and counts
 * `audit-event` frames received since this hook mounted.
 *
 * This is /overview's other proof-of-life half: it's what actually
 * changes the moment a real action happens against manar-api (e.g.
 * `POST /tasks`, which emits a `TASK_CREATED` audit event). Written in
 * Phase 11a, when manar-api had no GET/list endpoint for any resource —
 * a literal "active agent count" wasn't obtainable yet, so this
 * substituted for the design spec's illustrative example (see
 * docs/dependency-decisions.md). Phase 11b Part 1 added real list
 * endpoints (`GET /agents` etc. — see hooks/use-agents.ts and friends),
 * but this tile is left as-is rather than swapped to an agent count:
 * it's still a genuinely useful "is the live feed actually moving"
 * signal, and /live (Phase 11b Part 2) is the real full-featured
 * consumer of this same SSE mechanism. Deliberately labeled "this
 * session" in the UI, not an absolute total — it counts events observed
 * after connecting, not manar-api's full history.
 */
export function useLiveEventCount(): LiveEventCountState {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<LiveConnectionStatus>("connecting");
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/bff/events/live");
    sourceRef.current = source;

    source.onopen = () => setStatus("open");
    source.onerror = () => setStatus("error");
    source.addEventListener("audit-event", () => {
      setCount((current) => current + 1);
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  return { count, status };
}

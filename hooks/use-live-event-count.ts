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
 * `POST /tasks`, which emits a `TASK_CREATED` audit event — manar-api has
 * no GET/list endpoint for any resource yet, including agents, so a
 * literal "active agent count" isn't obtainable this phase; see
 * docs/auth-flow.md's sibling note in docs/dependency-decisions.md for
 * why this substitutes for the design spec's illustrative example).
 * Deliberately labeled "this session" in the UI, not an absolute total —
 * it counts events observed after connecting, not manar-api's full
 * history.
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

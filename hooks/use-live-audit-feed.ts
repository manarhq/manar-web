"use client";

import { useEffect, useRef, useState } from "react";

import type { components } from "@/lib/api/schema";

export type LiveAuditEvent = components["schemas"]["LiveAuditEventEnvelopeDto"];
export type LiveConnectionStatus = "connecting" | "open" | "error";

const MAX_BUFFERED_EVENTS = 300;

export interface LiveAuditFeedState {
  events: LiveAuditEvent[];
  status: LiveConnectionStatus;
  clear: () => void;
}

/**
 * The real scrolling activity feed Phase 11a's `/overview` proof-of-life
 * counter (hooks/use-live-event-count.ts) was explicitly built to prove
 * out first — same `EventSource` against `/api/bff/events/live` (the BFF
 * proxy streams `text/event-stream` through unmodified, so the same
 * Authorization-attaching code path used for every JSON call also works
 * here), same `audit-event` frame name, just keeping the actual parsed
 * envelopes (capped at MAX_BUFFERED_EVENTS, newest first) instead of a
 * bare count.
 */
export function useLiveAuditFeed(): LiveAuditFeedState {
  const [events, setEvents] = useState<LiveAuditEvent[]>([]);
  const [status, setStatus] = useState<LiveConnectionStatus>("connecting");
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const source = new EventSource("/api/bff/events/live");
    sourceRef.current = source;

    source.onopen = () => setStatus("open");
    source.onerror = () => setStatus("error");
    source.addEventListener("audit-event", (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as LiveAuditEvent;
        setEvents((current) => [parsed, ...current].slice(0, MAX_BUFFERED_EVENTS));
      } catch {
        // A frame that doesn't parse as the expected envelope is dropped
        // rather than crashing the feed — same posture as any other
        // best-effort streaming consumer.
      }
    });

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, []);

  return { events, status, clear: () => setEvents([]) };
}

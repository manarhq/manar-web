"use client";

import { useEffect, useState } from "react";

import type { components } from "@/lib/api/schema";
import { useLiveFeedAllowed } from "@/components/manar/live/live-feed-access";
import { getStreamState, startApprovalsStream } from "@/lib/live/approvals-stream";

export type LiveAuditEvent = components["schemas"]["LiveAuditEventEnvelopeDto"];
export type LiveConnectionStatus = "connecting" | "open" | "error";

const MAX_BUFFERED_EVENTS = 300;

export interface LiveAuditFeedState {
  events: LiveAuditEvent[];
  status: LiveConnectionStatus;
  clear: () => void;
}

/**
 * The scrolling activity feed behind /live: the parsed envelopes (capped at MAX_BUFFERED_EVENTS,
 * newest first) from the tab's one shared stream (lib/live/approvals-stream.ts, which closes it
 * while the tab is hidden). Events during a hidden spell are not replayed.
 */
export function useLiveAuditFeed(): LiveAuditFeedState {
  const [events, setEvents] = useState<LiveAuditEvent[]>([]);
  const [status, setStatus] = useState<LiveConnectionStatus>(getStreamState);

  const allowed = useLiveFeedAllowed();

  useEffect(() => {
    // A role the feed refuses (403) never opens a stream.
    if (!allowed) return;
    return startApprovalsStream({
      onEvent: (envelope) =>
        setEvents((current) =>
          [envelope as unknown as LiveAuditEvent, ...current].slice(0, MAX_BUFFERED_EVENTS),
        ),
      onState: () => setStatus(getStreamState()),
    });
  }, [allowed]);

  return { events, status, clear: () => setEvents([]) };
}

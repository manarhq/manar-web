"use client";

import { useEffect, useState } from "react";

import { getStreamState, startApprovalsStream } from "@/lib/live/approvals-stream";

export type LiveConnectionStatus = "connecting" | "open" | "error";

export interface LiveEventCountState {
  count: number;
  status: LiveConnectionStatus;
}

/**
 * Counts `audit-event` frames received since this hook mounted, from the tab's one shared live
 * stream (lib/live/approvals-stream.ts, `GET /events/live` through the BFF). It is
 * /overview's proof-of-life tile: it changes the moment a real action happens against manar-api.
 * Deliberately labeled "this session" in the UI, not an absolute total: it counts events observed
 * after connecting, not manar-api's full history.
 */
export function useLiveEventCount(): LiveEventCountState {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<LiveConnectionStatus>(getStreamState);

  useEffect(() => {
    return startApprovalsStream({
      onEvent: () => setCount((current) => current + 1),
      onState: () => setStatus(getStreamState()),
    });
  }, []);

  return { count, status };
}

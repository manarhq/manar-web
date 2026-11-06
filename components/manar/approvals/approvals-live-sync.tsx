"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { startApprovalsStream } from "@/lib/live/approvals-stream";

/** Brief pause so a burst of events (one request often makes several) is one refetch. */
const COALESCE_MS = 250;

/**
 * Mounted once in the shell: keeps approvals fresh from the live stream and tells the polling
 * hooks when to take over. Renders nothing.
 */
export function ApprovalsLiveSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      }, COALESCE_MS);
    };
    // onStatus also refreshes: after a drop it restarts fallback polling, after a reconnect it
    // catches whatever happened while the stream was down.
    const stop = startApprovalsStream({ onApproval: refresh, onStatus: refresh });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [queryClient]);
  return null;
}

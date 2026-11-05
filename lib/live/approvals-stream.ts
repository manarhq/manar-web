/**
 * One shared Server-Sent Events connection per tab to manar-api's tenant audit feed
 * (`GET /events/live`, through the BFF), used only to learn that an approval changed.
 * manar-api already publishes `approval.requested|approved|denied|expired|superseded|revoked`
 * on it (agent tasks and device approvals alike), so no new event type is needed.
 *
 * The feed needs AUDITOR, SECURITY_ADMIN or TENANT_OWNER; for anyone else it answers 403 and
 * EventSource closes. That, a network drop, or a missing EventSource all leave
 * `isApprovalsStreamOpen()` false, and the hooks fall back to polling.
 */

export const APPROVAL_EVENT_PREFIX = "approval.";
/** Polling while the stream is down (also the permanent mode for approvers without audit access). */
export const FALLBACK_POLL_MS = 15_000;
/**
 * While the stream is open, a slow reconcile still runs: SSE comments (heartbeats) never reach
 * JavaScript, so a connection that silently stalled cannot be told apart from a quiet one.
 */
export const RECONCILE_POLL_MS = 60_000;

let source: EventSource | null = null;
let open = false;
let refs = 0;
let current: { onApproval: () => void; onStatus: () => void } | null = null;

export function isApprovalsStreamOpen(): boolean {
  return open;
}

/**
 * The refetch interval for an approvals query: a slow reconcile while the stream is open, the
 * fallback otherwise. With several pages loaded it returns false: a refetch reloads every loaded
 * page, so only the first-page view polls (focus and stream events still refresh the rest).
 */
export function approvalsPollInterval(
  pages: number,
  fallbackMs = FALLBACK_POLL_MS,
): number | false {
  if (pages > 1) return false;
  return open ? RECONCILE_POLL_MS : fallbackMs;
}

export function isApprovalEvent(eventType: unknown): boolean {
  return typeof eventType === "string" && eventType.startsWith(APPROVAL_EVENT_PREFIX);
}

/**
 * Connects (once per tab, however many callers) and reports changes. `onApproval` fires for each
 * approval event; `onStatus` fires when the stream opens or drops, so callers can re-evaluate
 * their polling. Returns the unsubscribe function.
 */
export function startApprovalsStream(handlers: {
  onApproval: () => void;
  onStatus: () => void;
}): () => void {
  if (typeof EventSource === "undefined") return () => {};
  refs += 1;
  if (!source) {
    const es = new EventSource("/api/bff/events/live");
    source = es;
    es.onopen = () => {
      open = true;
      current?.onStatus();
    };
    es.onerror = () => {
      open = false;
      current?.onStatus();
    };
    es.addEventListener("audit-event", (event) => {
      try {
        const envelope = JSON.parse((event as MessageEvent<string>).data) as {
          eventType?: unknown;
        };
        if (isApprovalEvent(envelope.eventType)) current?.onApproval();
      } catch {
        // A frame that does not parse is ignored; the slow reconcile poll still catches changes.
      }
    });
  }
  current = handlers;
  return () => {
    refs -= 1;
    if (refs <= 0) {
      source?.close();
      source = null;
      open = false;
      current = null;
      refs = 0;
    }
  };
}

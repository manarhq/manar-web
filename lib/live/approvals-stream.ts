/**
 * One shared Server-Sent Events connection per tab to manar-api's tenant audit feed
 * (`GET /events/live`, through the BFF), used only to learn that an approval changed.
 * manar-api already publishes `approval.requested|approved|denied|expired|superseded|revoked`
 * on it (agent tasks and device approvals alike), so no new event type is needed.
 *
 * The feed needs AUDITOR, SECURITY_ADMIN or TENANT_OWNER, so the shell mounts the subscriber only
 * for those roles (`canReadLiveFeed`); everyone else polls. While the stream is not open the
 * hooks poll (`approvalsPollInterval`). EventSource closes for good on a non-200 (401, 502, 503),
 * so this module reconnects itself with exponential backoff plus jitter, and retries at once when
 * the tab becomes visible again. Subscribers hear only real open/closed transitions, so a flapping
 * API cannot keep restarting the fast poll.
 */

export const APPROVAL_EVENT_PREFIX = "approval.";
/** Polling while the stream is not open. */
export const FALLBACK_POLL_MS = 15_000;
/**
 * While the stream is open, a slow reconcile still runs: SSE comments (heartbeats) never reach
 * JavaScript, so a connection that silently stalled cannot be told apart from a quiet one.
 */
export const RECONCILE_POLL_MS = 60_000;
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 60_000;

export interface StreamHandlers {
  /** An approval event arrived. */
  onApproval: () => void;
  /** The stream opened or closed (only on a real change). */
  onStatus: () => void;
}

const subs = new Set<StreamHandlers>();
let source: EventSource | null = null;
let open = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let visibilityBound = false;

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

/** Delay before reconnect number `n` (0 based): 1 s, 2 s, 4 s ... capped, with 50 to 100% jitter. */
export function backoffDelay(n: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** n);
  return Math.round(ceiling * (0.5 + random() * 0.5));
}

function setOpen(next: boolean) {
  if (next === open) return;
  open = next;
  subs.forEach((s) => s.onStatus());
}

function connect() {
  clearTimeout(retryTimer);
  if (source || subs.size === 0 || typeof EventSource === "undefined") return;
  const es = new EventSource("/api/bff/events/live");
  source = es;
  es.onopen = () => {
    attempt = 0;
    setOpen(true);
  };
  es.onerror = () => {
    setOpen(false);
    // CLOSED means the browser gave up (a non-200); CONNECTING means it is retrying by itself.
    if (es.readyState === 2) {
      es.close();
      source = null;
      retryTimer = setTimeout(connect, backoffDelay(attempt++));
    }
  };
  es.addEventListener("audit-event", (event) => {
    try {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as { eventType?: unknown };
      if (isApprovalEvent(envelope.eventType)) subs.forEach((s) => s.onApproval());
    } catch {
      // A frame that does not parse is ignored; the slow reconcile poll still catches changes.
    }
  });
}

function onVisible() {
  if (document.visibilityState === "visible" && !source && subs.size > 0) {
    attempt = 0;
    connect();
  }
}

/** Subscribes (the connection opens with the first subscriber and closes with the last). */
export function startApprovalsStream(handlers: StreamHandlers): () => void {
  if (typeof EventSource === "undefined") return () => {};
  subs.add(handlers);
  if (!visibilityBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisible);
    visibilityBound = true;
  }
  connect();
  return () => {
    subs.delete(handlers);
    if (subs.size === 0) {
      clearTimeout(retryTimer);
      source?.close();
      source = null;
      attempt = 0;
      open = false;
      if (visibilityBound) document.removeEventListener("visibilitychange", onVisible);
      visibilityBound = false;
    }
  };
}

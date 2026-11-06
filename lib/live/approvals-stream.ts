/**
 * The one Server-Sent Events connection per browser tab to manar-api's tenant audit feed
 * (`GET /events/live`, through the BFF). Everything that listens to the feed goes through here:
 * the approvals sync (which only needs to learn that an approval changed), the overview event
 * counter and the Live feed. A tab must not open more than one: over HTTP/1.1 a browser allows
 * six connections per origin, and several tabs with a few streams each used the six up and froze
 * the console.
 *
 * manar-api already publishes `approval.requested|approved|denied|expired|superseded|revoked` on
 * the feed (agent tasks and device approvals alike), so no new event type is needed. While only
 * the approvals sync listens, the stream asks the server for `?prefix=approval.`; a subscriber
 * that wants every event (`onEvent`) makes the tab's connection unfiltered until it closes. A
 * server that ignores the parameter just sends more, and approvals are filtered here too.
 *
 * The feed needs AUDITOR, SECURITY_ADMIN or TENANT_OWNER, so the shell mounts the approvals sync
 * only for those roles (`canReadLiveFeed`). Roles without a stream poll fast (3 s queue, 2 s
 * detail); with a stream wanted but down the hooks poll at `FALLBACK_POLL_MS`. The connection is
 * closed while the tab is hidden (a background tab holds no connection) and reopened when it is
 * visible again; the reopening refreshes subscribers. EventSource closes for good on a non-200
 * (401, 502, 503), so this module reconnects itself with exponential backoff plus jitter.
 * `onStatus` fires only on real open/closed transitions, so a flapping API cannot keep restarting
 * the fast poll.
 */

export const APPROVAL_EVENT_PREFIX = "approval.";
/** Polling while the stream is not open. */
export const FALLBACK_POLL_MS = 15_000;
/** Polling for a tab that has no stream at all (the role cannot read the feed). */
export const NO_STREAM_POLL_MS = 3_000;
/**
 * While the stream is open, a slow reconcile still runs: SSE comments (heartbeats) never reach
 * JavaScript, so a connection that silently stalled cannot be told apart from a quiet one.
 */
export const RECONCILE_POLL_MS = 60_000;
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 60_000;

export type StreamState = "connecting" | "open" | "error";

export interface StreamHandlers {
  /** An approval event arrived. */
  onApproval?: () => void;
  /** The stream opened or closed (only on a real change). */
  onStatus?: () => void;
  /** Any change of `getStreamState()`, including connecting to error. */
  onState?: () => void;
  /** Every event, parsed. Asking for this makes the tab's connection unfiltered. */
  onEvent?: (envelope: { eventType?: unknown } & Record<string, unknown>) => void;
}

const subs = new Set<StreamHandlers>();
let source: EventSource | null = null;
let open = false;
let state: StreamState = "connecting";
/** The open connection carries every event (no `?prefix=`). */
let unfiltered = false;
let attempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let visibilityBound = false;

export function isApprovalsStreamOpen(): boolean {
  return open;
}

export function getStreamState(): StreamState {
  return state;
}

/**
 * The refetch interval for an approvals query: a slow reconcile while the stream is open;
 * `streamDownMs` while one is wanted but down; `noStreamMs` where this tab never gets a stream
 * (roles that cannot read the feed), which keeps their previous 3 s / 2 s polling. With several
 * pages loaded it returns false: a refetch reloads every loaded page, so only the first-page view
 * polls (focus and stream events still refresh the rest).
 */
export function approvalsPollInterval(
  pages: number,
  streamDownMs = FALLBACK_POLL_MS,
  noStreamMs = NO_STREAM_POLL_MS,
): number | false {
  if (pages > 1) return false;
  if (subs.size === 0) return noStreamMs;
  return open ? RECONCILE_POLL_MS : streamDownMs;
}

export function isApprovalEvent(eventType: unknown): boolean {
  return typeof eventType === "string" && eventType.startsWith(APPROVAL_EVENT_PREFIX);
}

/** Delay before reconnect number `n` (0 based): 1 s, 2 s, 4 s ... capped, with 50 to 100% jitter. */
export function backoffDelay(n: number, random: () => number = Math.random): number {
  const ceiling = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** n);
  return Math.round(ceiling * (0.5 + random() * 0.5));
}

function setState(next: StreamState) {
  if (next === state) return;
  state = next;
  const nowOpen = next === "open";
  const changed = nowOpen !== open;
  open = nowOpen;
  [...subs].forEach((s) => {
    if (changed) s.onStatus?.();
    s.onState?.();
  });
}

const wantsAll = () => [...subs].some((s) => s.onEvent);

function hidden() {
  return typeof document !== "undefined" && document.hidden;
}

function closeSource() {
  clearTimeout(retryTimer);
  source?.close();
  source = null;
}

function connect() {
  clearTimeout(retryTimer);
  if (source || subs.size === 0 || typeof EventSource === "undefined" || hidden()) return;
  unfiltered = wantsAll();
  const es = new EventSource(
    unfiltered ? "/api/bff/events/live" : `/api/bff/events/live?prefix=${APPROVAL_EVENT_PREFIX}`,
  );
  source = es;
  es.onopen = () => {
    attempt = 0;
    setState("open");
  };
  es.onerror = () => {
    // CLOSED means the browser gave up (a non-200); CONNECTING means it is retrying by itself.
    setState("error");
    if (es.readyState === 2) {
      es.close();
      source = null;
      retryTimer = setTimeout(connect, backoffDelay(attempt++));
    }
  };
  es.addEventListener("audit-event", (event) => {
    let envelope: { eventType?: unknown } & Record<string, unknown>;
    try {
      envelope = JSON.parse((event as MessageEvent<string>).data);
    } catch {
      // A frame that does not parse is ignored; the slow reconcile poll still catches changes.
      return;
    }
    const approval = isApprovalEvent(envelope.eventType);
    [...subs].forEach((s) => {
      s.onEvent?.(envelope);
      if (approval) s.onApproval?.();
    });
  });
}

function onVisibility() {
  if (hidden()) {
    // A background tab holds no connection. Closing is silent: nobody needs a refresh now, and
    // the reopening (open transition) refreshes whatever changed meanwhile.
    closeSource();
    attempt = 0;
    open = false;
    state = "connecting";
  } else if (!source && subs.size > 0) {
    attempt = 0;
    connect();
  }
}

/** Subscribes (the connection opens with the first subscriber and closes with the last). */
export function startApprovalsStream(handlers: StreamHandlers): () => void {
  if (typeof EventSource === "undefined") return () => {};
  subs.add(handlers);
  if (!visibilityBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    visibilityBound = true;
  }
  // A subscriber that wants every event cannot use the filtered connection: reconnect unfiltered
  // (narrowing again is not worth a reconnect).
  if (source && handlers.onEvent && !unfiltered) {
    closeSource();
    setState("connecting");
  }
  connect();
  return () => {
    subs.delete(handlers);
    if (subs.size === 0) {
      closeSource();
      attempt = 0;
      open = false;
      state = "connecting";
      if (visibilityBound) document.removeEventListener("visibilitychange", onVisibility);
      visibilityBound = false;
    }
  };
}

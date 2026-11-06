/**
 * The 10-second Undo (founder decision, 3 Nov 2026). A decision made in the console is held here
 * for 10 seconds before it is sent, and Undo simply drops it: nothing reached Manar, so nothing
 * reached the device. The device that is waiting keeps waiting (it sees PENDING) and gets the
 * answer 10 seconds later.
 *
 * Not held, sent at once: a decision on a request that expires within `MIN_LIFE_MS` (holding it
 * would let it run out; the toast then offers Revoke instead of Undo). Closing or hiding the tab
 * sends everything still held (`flushHeld`, on `pagehide`), so a decision is never lost.
 */
export const UNDO_MS = 10_000;
/** Below this much life left, a decision is sent at once rather than held. */
export const MIN_LIFE_MS = 15_000;

interface Held {
  timer: ReturnType<typeof setTimeout>;
  send: () => void | Promise<unknown>;
  /** The send has started: it can no longer be undone, but the item stays hidden until it settles. */
  sending: boolean;
}

const held = new Map<string, Held>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();

function changed() {
  snapshot = new Set(held.keys());
  for (const l of listeners) l();
}

/** True when this decision can be held (and undone) rather than sent at once. */
export function canHold(expiresAt: string | Date, now = Date.now()): boolean {
  return new Date(expiresAt).getTime() - now > MIN_LIFE_MS;
}

/**
 * Holds `send` for UNDO_MS. Returns false (and sends nothing) if this id is already held. The id
 * stays in `heldIds` (so the queue keeps the item hidden) until `send`'s promise settles, which is
 * after the list has been refetched; otherwise the answered request would flash back as pending.
 */
export function holdDecision(id: string, send: () => void | Promise<unknown>): boolean {
  if (held.has(id)) return false;
  const entry: Held = { timer: setTimeout(() => fire(id), UNDO_MS), send, sending: false };
  held.set(id, entry);
  changed();
  return true;
}

function fire(id: string): void {
  const h = held.get(id);
  if (!h || h.sending) return;
  clearTimeout(h.timer);
  h.sending = true;
  const settle = () => {
    if (held.get(id) === h) held.delete(id);
    changed();
  };
  try {
    Promise.resolve(h.send()).then(settle, settle);
  } catch {
    settle();
  }
}

/** Undo: drop a held decision. False when it was already sent. */
export function undoDecision(id: string): boolean {
  const h = held.get(id);
  if (!h || h.sending) return false;
  clearTimeout(h.timer);
  held.delete(id);
  changed();
  return true;
}

/** Sends everything still held now (the tab is closing). */
export function flushHeld(): void {
  for (const id of [...held.keys()]) fire(id);
}

export function subscribeHeld(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function heldIds(): ReadonlySet<string> {
  return snapshot;
}

if (typeof window !== "undefined") window.addEventListener("pagehide", flushHeld);

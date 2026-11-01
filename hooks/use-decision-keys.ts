"use client";

import { useEffect, useRef } from "react";

/** Time after a request first renders before its keys work, so a keystroke meant for the previous
 * request (or a key held down) cannot answer a new one. */
export const DECISION_KEYS_ARM_MS = 750;

const TEXT_TARGET = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";
/** Anything modal or popped open: dialogs, menus, listboxes, and the trigger that opened one. */
const OPEN_OVERLAY =
  "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox'], [aria-modal='true'], [aria-haspopup][aria-expanded='true']";

function inTextField(el: Element | null): boolean {
  return Boolean(el && (el.matches(TEXT_TARGET) || el.closest(TEXT_TARGET)));
}

export interface DecisionKeys {
  /** Changes whenever the request shown changes; resets the arming timer. */
  requestId: string;
  /** "a": approve once only, never a longer grant or a rule. */
  onApprove: () => void;
  /** "d": deny. */
  onDeny: () => void;
  /** "j" / "k": next and previous request in a queue. Navigation only, never a decision. */
  onNext?: () => void;
  onPrev?: () => void;
  enabled?: boolean;
}

/**
 * Keyboard shortcuts A (approve once) and D (deny) for a pending request, safe against slips:
 * ignored in text fields and while any dialog or menu is open, ignored with a modifier
 * (ctrl/meta/alt/shift) or when auto-repeating, only armed 750 ms after the current request
 * rendered, and after one decision the key must be released before another is accepted.
 */
export function useDecisionKeys({
  requestId,
  onApprove,
  onDeny,
  onNext,
  onPrev,
  enabled = true,
}: DecisionKeys) {
  const handlers = useRef({ onApprove, onDeny, onNext, onPrev });
  useEffect(() => {
    handlers.current = { onApprove, onDeny, onNext, onPrev };
  });

  useEffect(() => {
    if (!enabled) return;
    let armed = false;
    let needKeyup = false;
    const timer = setTimeout(() => (armed = true), DECISION_KEYS_ARM_MS);

    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const nav = key === "j" || key === "k";
      if (key !== "a" && key !== "d" && !nav) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (inTextField(event.target as Element | null) || inTextField(document.activeElement))
        return;
      if (document.querySelector(OPEN_OVERLAY)) return;
      if (nav) {
        // Moving through the queue is harmless: no arming, repeat allowed.
        (key === "j" ? handlers.current.onNext : handlers.current.onPrev)?.();
        return;
      }
      if (!armed || needKeyup || event.repeat) return;
      needKeyup = true;
      (key === "a" ? handlers.current.onApprove : handlers.current.onDeny)();
    }
    function onKeyUp(event: KeyboardEvent) {
      if (["a", "d"].includes(event.key.toLowerCase())) needKeyup = false;
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, [requestId, enabled]);
}

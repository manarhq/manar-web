"use client";

import { useEffect, useState } from "react";

/**
 * Ticks up once per second while `active` is true. The three long-form
 * AI panels (incident summarize, policy suggest, audit investigate) use
 * this as their in-progress affordance: those calls legitimately take
 * 10-30s end to end (manar-api's `AI_ADVISORY_LONGFORM_TIMEOUT_MS`
 * default), so a bare spinner with no elapsed-time signal reads as
 * "stuck" long before it actually is. Resets to 0 whenever `active`
 * transitions from false to true, so re-running a mutation restarts the
 * count rather than continuing a stale one.
 *
 * The reset happens during render, comparing `active` against its own
 * previously-rendered value held in state (the "adjusting state when a
 * prop changes" pattern — see
 * react.dev/learn/you-might-not-need-an-effect — using state rather than
 * a ref, since this codebase's lint config forbids reading/writing refs
 * during render). The ticking `useEffect` below never calls `setSeconds`
 * synchronously from its own body — only from the `setInterval` callback.
 */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);
  const [prevActive, setPrevActive] = useState(active);

  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setSeconds(0);
  }

  useEffect(() => {
    if (!active) return;

    const start = Date.now();
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

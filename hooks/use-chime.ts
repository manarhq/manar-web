"use client";

import { useEffect, useRef } from "react";

import { chimeEnabled, playChime } from "@/lib/push/chime";

/** Plays the opt-in chime when the number of waiting approvals goes up (never on first load,
 * never when the person has not turned it on: decision #59). */
export function useChime(count: number) {
  const previous = useRef<number | null>(null);
  useEffect(() => {
    if (previous.current !== null && count > previous.current && chimeEnabled(window.localStorage))
      playChime();
    previous.current = count;
  }, [count]);
}

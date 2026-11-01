"use client";

import { useEffect } from "react";

import { captureInstallPrompt } from "@/lib/pwa/install";

/** Registers the service worker (push only, it caches nothing) and listens for the install prompt. */
export function PwaBoot() {
  useEffect(() => {
    const stop = captureInstallPrompt();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return stop;
  }, []);
  return null;
}

import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * React deliberately warns when `useLayoutEffect` is used during server
 * rendering (it can never run there), and every Client Component in this
 * app is server-rendered first. The effects that need it — writing a
 * preference attribute onto `<html>` before the browser paints — are
 * browser-only by definition, so this picks the right hook per
 * environment instead of leaving a warning in the build output.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

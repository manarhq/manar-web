"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useDataPreferences } from "@/hooks/use-data-preferences";
import { routeShape, setTrackingEnabled, track } from "@/lib/telemetry/track";

const SIGNED_IN_FLAG = "manar:signed-in-sent";

/**
 * Mirrors the effective flag into track(), sends `sign_in_completed` once per browser tab session
 * (a sessionStorage boolean, not an identifier) and a page view on every route change.
 */
export function TelemetryBoot() {
  const { data } = useDataPreferences();
  const pathname = usePathname();
  const on = data?.effective.improveManar === true;

  useEffect(() => {
    setTrackingEnabled(on);
    if (on && !window.sessionStorage.getItem(SIGNED_IN_FLAG)) {
      window.sessionStorage.setItem(SIGNED_IN_FLAG, "1");
      track("sign_in_completed");
    }
  }, [on]);

  useEffect(() => {
    if (on) track("page_view", { route: routeShape(pathname) });
  }, [on, pathname]);

  return null;
}

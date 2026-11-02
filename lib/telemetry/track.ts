/**
 * Product-improvement events (docs: manar docs/superpowers/specs/2026-11-02-data-collection-design.md).
 * Posts to our own BFF only: no third-party script, no cookie, no stored identifier. The effective
 * flag is mirrored here so a switched-off user sends nothing at all; manar-api stays the authority
 * and drops events again on its side. Unknown flag (not loaded yet) counts as off.
 */
export type TrackProps = Record<string, string | number | boolean>;

export const TELEMETRY_URL = "/api/bff/telemetry/events";

let enabled = false;

export function setTrackingEnabled(value: boolean): void {
  enabled = value;
}

export function track(name: string, props: TrackProps = {}): void {
  if (!enabled || typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ events: [{ name, at: new Date().toISOString(), props }] });
    const sent = navigator.sendBeacon?.(
      TELEMETRY_URL,
      new Blob([body], { type: "application/json" }),
    );
    if (sent) return;
    void fetch(TELEMETRY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Telemetry never breaks the page.
  }
}

/** `/sessions/3f2a-...` becomes `/sessions/:id`, so a route is sent without any record ids. */
export function routeShape(pathname: string): string {
  return pathname
    .split("/")
    .map((s) => (/^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s) ? ":id" : s))
    .join("/");
}

/** Error boundary event: the route and the error's class name only, never its message or stack. */
export function trackClientError(pathname: string, error: Error): void {
  track("client_error", { route: routeShape(pathname), error: error.name });
}

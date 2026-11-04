/**
 * Product-improvement events (docs: manar docs/superpowers/specs/2026-11-02-data-collection-design.md).
 * Posts to our own BFF only: no third-party script, no cookie, no stored identifier. The effective
 * flag is mirrored here so a switched-off user sends nothing at all; manar-api stays the authority
 * and drops events again on its side. Unknown flag (not loaded yet) counts as off.
 */
/** The names manar-api accepts (its allow-list). Nothing else is ever sent. */
export const EVENT_NAMES = [
  "page_view",
  "sign_in_completed",
  "device_added",
  "first_approval_answered",
  "plan_changed",
  "client_error",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

export type TrackProps = Record<string, string | number | boolean>;

export const TELEMETRY_URL = "/api/bff/telemetry/events";

let enabled = false;

export function setTrackingEnabled(value: boolean): void {
  enabled = value;
}

export function track(name: EventName, props: TrackProps = {}): void {
  if (!enabled || !EVENT_NAMES.includes(name) || typeof window === "undefined") return;
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

/**
 * Every static route folder under app/[locale] (dynamic [param] folders excluded). A test keeps
 * this equal to the folders on disk.
 */
export const STATIC_ROUTE_SEGMENTS: ReadonlySet<string> = new Set([
  ...["en", "ar"],
  ...(
    "account activity add-device agents ai ai-systems ai-tools approvals audit authorization " +
    "billing cloud compliance home hosts incidents integrations join live login mcp-servers " +
    "notifications overview p policies privacy profile report residency roles rules sample " +
    "secrets security sessions settings setup sign-in sites spend sso suspended tasks team tools users"
  ).split(" "),
]);

/** Anything that is not a known static segment (ids, tokens, emails, slugs) becomes `:id`. */
export function routeShape(pathname: string): string {
  return pathname
    .split("/")
    .map((s) => (s === "" || STATIC_ROUTE_SEGMENTS.has(s) ? s : ":id"))
    .join("/");
}

/** Error boundary event: the route and the error's class name only, never its message or stack. */
export function trackClientError(pathname: string, error: Error): void {
  track("client_error", { route: routeShape(pathname), error: error.name });
}

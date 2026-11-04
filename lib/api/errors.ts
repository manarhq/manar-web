/**
 * manar-api's uniform error envelope (`ErrorResponseDto`:
 * `{ statusCode, message, error }`) shows up as `error` on every
 * `openapi-fetch` call this app makes. This is the one place that turns
 * that into a displayable string, so no call site hand-rolls its own
 * `String(error)`/optional-chaining guesswork.
 */
export interface ApiErrorShape {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

/** Bare HTTP reason phrases ("Internal Server Error") say nothing to a person: the caller's
 * fallback is shown instead. */
const GENERIC = /^(internal server error|bad gateway|service unavailable|gateway timeout)$/i;

export function apiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return GENERIC.test(error.trim()) ? fallback : error;
  if (typeof error === "object" && error !== null) {
    const shape = error as ApiErrorShape & { reason?: unknown };
    // Keep manar-api's reason code (e.g. enforcement_dependency_unavailable) visible.
    const suffix = typeof shape.reason === "string" ? ` (${shape.reason})` : "";
    if (Array.isArray(shape.message)) return (shape.message.join(", ") || fallback) + suffix;
    if (
      typeof shape.message === "string" &&
      shape.message.length > 0 &&
      !GENERIC.test(shape.message)
    )
      return shape.message + suffix;
    if (typeof shape.error === "string" && shape.error.length > 0 && !GENERIC.test(shape.error))
      return shape.error + suffix;
    if (suffix) return fallback + suffix;
  }
  return fallback;
}

/** Best-effort HTTP status extraction — used to special-case e.g. 409
 * (approval already decided) without string-matching a message. */
export function apiErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const status = (error as ApiErrorShape).statusCode;
    if (typeof status === "number") return status;
  }
  return undefined;
}

export type ApiFailureKind = "notFound" | "unauthenticated" | "forbidden" | "unavailable";

export interface ApiFailure {
  kind: ApiFailureKind;
  status?: number;
  /** manar-api's stable reason code, e.g. `enforcement_dependency_unavailable`. */
  reason?: string;
}

/**
 * What a failed read means for the screen (GATE-0 S50/S51). Only an
 * explicit 404 is "not found"; anything we cannot positively identify
 * (5xx, a network failure, an unparseable body) is "unavailable", never
 * empty and never "does not exist".
 */
export function classifyApiError(error: unknown): ApiFailure {
  const shape =
    typeof error === "object" && error !== null
      ? (error as ApiErrorShape & { reason?: unknown })
      : {};
  const reason = typeof shape.reason === "string" ? shape.reason : undefined;
  let status = apiErrorStatus(error);
  // The BFF's own 401s (no session / refresh failed) carry no statusCode.
  if (
    status === undefined &&
    (shape.error === "unauthenticated" || shape.error === "session_expired")
  ) {
    status = 401;
  }
  const kind: ApiFailureKind =
    status === 404
      ? "notFound"
      : status === 401
        ? "unauthenticated"
        : status === 403
          ? "forbidden"
          : "unavailable";
  return { kind, status, reason };
}

export function isNotFoundError(error: unknown): boolean {
  return classifyApiError(error).kind === "notFound";
}

/**
 * DESK spec 9.2: manar-api answers every customer route of a suspended or banned person with
 * 403 `account_suspended` (only /me/restriction, /me/appeals and the data export still work).
 * The console then shows /suspended instead of a broken page.
 */
export function isAccountSuspended(status: number, body: unknown): boolean {
  return (
    status === 403 &&
    typeof body === "object" &&
    body !== null &&
    (body as { code?: unknown }).code === "account_suspended"
  );
}

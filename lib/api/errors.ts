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

export function apiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const shape = error as ApiErrorShape;
    if (Array.isArray(shape.message)) return shape.message.join(", ") || fallback;
    if (typeof shape.message === "string" && shape.message.length > 0) return shape.message;
    if (typeof shape.error === "string" && shape.error.length > 0) return shape.error;
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

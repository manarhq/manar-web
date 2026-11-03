/**
 * JSON calls to manar-api routes that are not in `lib/api/schema.d.ts` yet (device approvals and
 * push, added by the approvals track). They go through the same BFF as `apiClient`, so the browser
 * still never holds a token. Once manar-api's PR is merged, `pnpm api:codegen` types them and
 * these calls can move to `apiClient`.
 */
import { idempotencyHeader } from "@/lib/api/idempotency";
export class BffError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The parsed JSON error body, when there was one: `reason` and `message` live here (E-021). */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "BffError";
  }

  /** manar-api's stable reason code (`paused`, `already_decided`, ...), when it sent one. */
  get reason(): string | undefined {
    const b = this.body as { reason?: unknown } | undefined;
    return typeof b?.reason === "string" ? b.reason : undefined;
  }
}

export async function bffJson<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    /** Let the request finish after the page goes away (a held approval sent on `pagehide`). */
    keepalive?: boolean;
  } = {},
): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...idempotencyHeader(init.method),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
    keepalive: init.keepalive,
  });
  if (!res.ok) {
    // Keep the body: a 409 says *why* (paused, expired, already decided), and dropping it made
    // every conflict read as "already decided" (E-021).
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    throw new BffError(res.status, `HTTP ${res.status}`, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

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
  ) {
    super(message);
    this.name = "BffError";
  }
}

export async function bffJson<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`/api/bff${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...idempotencyHeader(init.method),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  if (!res.ok) throw new BffError(res.status, `HTTP ${res.status}`);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

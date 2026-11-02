import createClient from "openapi-fetch";

import { idempotencyHeader } from "./idempotency";
import type { paths } from "./schema";

/**
 * Manar's typed API client — `openapi-fetch` bound to the types
 * `scripts/generate-api-client.mjs` generates from manar-api's live
 * OpenAPI document (`lib/api/schema.d.ts`). This is the only file that
 * should ever construct a client; every call site imports `apiClient`
 * (or `getServerApiClient()` for Server Components) rather than building
 * its own `fetch`.
 *
 * `baseUrl: "/api/bff"` — never manar-api's origin directly. See
 * docs/auth-flow.md: the browser never holds a bearer token, so it can
 * only ever reach manar-api through this app's own BFF proxy
 * (app/api/bff/[...path]), which attaches the real Authorization header
 * server-side from the encrypted session cookie.
 */
export const apiClient = createClient<paths>({ baseUrl: "/api/bff" });
apiClient.use({
  onRequest({ request }) {
    for (const [k, v] of Object.entries(idempotencyHeader(request.method))) {
      request.headers.set(k, v);
    }
  },
});

/** For Server Components / route handlers, which need an absolute URL
 * (relative URLs aren't valid for `fetch` outside a browser) but can
 * still route through the same BFF proxy so there's exactly one place
 * that ever attaches a real Authorization header. */
export function getServerApiClient(origin: string) {
  return createClient<paths>({ baseUrl: `${origin}/api/bff` });
}

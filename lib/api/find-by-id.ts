/**
 * Phase 11b Part 1 added cursor-paginated `GET` list endpoints for every
 * resource, but deliberately did **not** add a `GET /:id` for most of
 * them (Agent, Task, Tool, ApprovalRequest, and the audit search
 * endpoint all lack one — only Policy got a real `GET /policies/:id`;
 * see the Part 1 design spec's endpoint inventory). A detail route still
 * needs to resolve one specific row by ID somehow, so every detail page
 * for those five resources does it the same honest way: page through the
 * real list endpoint (the only real data source that exists) looking for
 * a matching `id`, rather than fabricating a per-resource GET the backend
 * doesn't have.
 *
 * Capped at `maxPages` × the endpoint's own page-size cap (100) — plenty
 * for this product's demo/foundation scale, and a page that can't be
 * found within that many pages returns `null` (rendered as a real "not
 * found" state) rather than hanging on an unbounded scan.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * manar-api's list-response DTOs (`AgentListResponseDto` etc.) declare
 * `nextCursor` with `@ApiProperty({ nullable: true, ... })` and no
 * explicit `type`, so `openapi-typescript` emits `{} | null` rather than
 * `string | null` — this normalizes the generated client's response
 * into the real runtime shape (an opaque string token, or null on the
 * last page) once, so no call site hand-rolls its own cast.
 */
export function normalizeCursorPage<T>(page: { items: T[]; nextCursor: unknown }): CursorPage<T> {
  return { items: page.items, nextCursor: (page.nextCursor as string | null) ?? null };
}

export async function scanListForId<T extends { id: string }>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>,
  id: string,
  maxPages = 25,
): Promise<T | null> {
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const { items, nextCursor } = await fetchPage(cursor);
    const found = items.find((item) => item.id === id);
    if (found) return found;
    if (!nextCursor) return null;
    cursor = nextCursor;
  }
  return null;
}

/** Same idea, for resources without a stable `id` field to match on
 * (audit events key on `eventId`) or that need an arbitrary predicate. */
export async function scanListFor<T>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>,
  predicate: (item: T) => boolean,
  maxPages = 25,
): Promise<T | null> {
  let cursor: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const { items, nextCursor } = await fetchPage(cursor);
    const found = items.find(predicate);
    if (found) return found;
    if (!nextCursor) return null;
    cursor = nextCursor;
  }
  return null;
}

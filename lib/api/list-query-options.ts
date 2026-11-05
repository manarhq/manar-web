/** Shared option for list hooks that a caller may want to gate (e.g. the command palette only
 * fetches once it is opened). `undefined` keeps TanStack Query's default of enabled. */
export interface ListQueryOptions {
  enabled?: boolean;
}

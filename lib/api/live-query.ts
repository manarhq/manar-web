/**
 * Query options for data that must be fresh whenever the operator looks at it: approvals and
 * incidents. The global default (app/providers.tsx) is staleTime 30 s and no refetch on window
 * focus; spread this into a hook to opt back in. Security state is invalidated on change, never
 * served from a timer.
 */
export const liveQueryOptions = {
  staleTime: 0,
  refetchOnWindowFocus: true,
} as const;

"use client";

import { createContext, useContext, type ReactNode } from "react";

const LiveFeedAccess = createContext(false);

/**
 * Whether the signed-in role may open `GET /events/live` (`canReadLiveFeed`, decided in the
 * shell from the roles manar-api reports). The counter and the Live feed read it, so a role the
 * feed would refuse (403) never opens a stream at all.
 */
export function LiveFeedAccessProvider({
  allowed,
  children,
}: {
  allowed: boolean;
  children: ReactNode;
}) {
  return <LiveFeedAccess.Provider value={allowed}>{children}</LiveFeedAccess.Provider>;
}

export function useLiveFeedAllowed(): boolean {
  return useContext(LiveFeedAccess);
}

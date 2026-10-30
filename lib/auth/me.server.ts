import "server-only";

import { cache } from "react";

import { freshAccessToken } from "@/lib/auth/token.server";
import { getSession } from "@/lib/auth/session.server";
import { fetchMe, type Me } from "@/lib/auth/workspace.server";

/**
 * Who the caller is, the active workspace and the roles held in it, read from manar-api for this
 * request. Roles are never in the session or the token. Returns null when there is no session or
 * manar-api refuses: callers then show the least privileged view (no roles), never a guess.

 */
export const getMe = cache(async (): Promise<Me | null> => {
  const session = await getSession();
  if (!session?.workspaceId) return null;
  try {
    const accessToken = await freshAccessToken(session);
    if (!accessToken) return null;
    return await fetchMe(accessToken, session.workspaceId);
  } catch (error) {
    console.error("Reading /me failed", error);
    return null;
  }
});

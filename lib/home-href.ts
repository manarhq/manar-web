import "server-only";

import { getSession } from "@/lib/auth/session.server";
import { resolveWorkspaceKind, usesPersonalShell } from "@/lib/workspace-kind";

/** Where the signed-in user's home is: `/home` in the personal shell, `/overview` in the console. */
export async function getHomeHref(): Promise<"/home" | "/overview"> {
  const session = await getSession();
  return usesPersonalShell(resolveWorkspaceKind(session)) ? "/home" : "/overview";
}

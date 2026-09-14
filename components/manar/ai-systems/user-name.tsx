"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useUsersList } from "@/hooks/use-users";

/**
 * Resolves the `UserProfile` UUIDs this resource carries (`ownerId`,
 * `createdBy`, a version's `changedBy`, a transition's `actorId`, a
 * link's `linkedBy`) to real display names, following the same
 * "one generous first page, reused for every row" pattern
 * `hooks/use-actor-name.ts` already uses — the console's standing rule
 * that raw UUIDs must not leak into the UI.
 *
 * Returns a resolver rather than resolving eagerly so one page can look
 * up many ids without re-running the underlying query per row, and falls
 * back to the raw id (never to a blank or a fabricated name) when a user
 * is not on that first page.
 */
export function useUserNameResolver() {
  const t = useTranslations("aiSystems");
  const usersQuery = useUsersList();

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersQuery.data?.pages.flatMap((page) => page.items) ?? []) {
      map.set(user.id, user.displayName);
    }
    return map;
  }, [usersQuery.data]);

  return function resolveUserName(id: string | null | undefined): string {
    if (!id) return t("unknownUser");
    return usersById.get(id) ?? id;
  };
}

/** Every user on the first page — the owner picker/filter's option list. */
export function useUserOptions() {
  const usersQuery = useUsersList();
  return useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [usersQuery.data],
  );
}

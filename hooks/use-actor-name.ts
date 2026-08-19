"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useUsersList } from "@/hooks/use-users";
import { useAgentsList } from "@/hooks/use-agents";

export interface AuditActor {
  type?: string;
  id?: string;
}

/**
 * Resolves an audit event's actor (design-rework.md's Data humanization
 * section: "Actor UUIDs -> resolve to display name where the data is
 * available") to a real display name, following the same list-and-look-
 * up-by-id pattern `hooks/use-tasks.ts`'s `assignedAgentId` column
 * already uses for agents — generalized here across both actor kinds
 * this product has: `human` resolves against `GET /users`
 * (`UserProfile`), `agent` against `GET /agents`. `system` has no
 * profile to resolve (it's the platform itself, not a UserProfile/Agent
 * row). Each list's first page is fetched once and reused for every
 * actor on the page — the same "one generous page" tradeoff
 * `use-tasks.ts` makes, appropriate at this product's demo/foundation
 * scale.
 *
 * Returns a resolver function rather than resolving eagerly so one call
 * site can look up many actors (an audit list's whole page of rows)
 * without re-running the underlying queries per row.
 */
export function useActorNameResolver() {
  const t = useTranslations("audit.actorType");
  const usersQuery = useUsersList();
  const agentsQuery = useAgentsList();

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of usersQuery.data?.pages.flatMap((page) => page.items) ?? []) {
      map.set(user.id, user.displayName);
    }
    return map;
  }, [usersQuery.data]);

  const agentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agentsQuery.data?.pages.flatMap((page) => page.items) ?? []) {
      map.set(agent.id, agent.displayName);
    }
    return map;
  }, [agentsQuery.data]);

  return function resolveActorName(actor: AuditActor | null | undefined): string {
    if (!actor?.type) return t("unknown");
    if (actor.type === "system") return t("system");
    if (actor.type === "human")
      return (actor.id && usersById.get(actor.id)) || actor.id || t("unknown");
    if (actor.type === "agent")
      return (actor.id && agentsById.get(actor.id)) || actor.id || t("unknown");
    return actor.id ?? t("unknown");
  };
}

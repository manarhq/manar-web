"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { NAV_GROUPS } from "@/lib/nav-config";
import { useAgentDetail } from "@/hooks/use-agents";
import { useTaskDetail } from "@/hooks/use-tasks";
import { useToolDetail } from "@/hooks/use-tools";
import { usePolicyDetail } from "@/hooks/use-policies";
import { useApprovalDetail } from "@/hooks/use-approvals";
import { useIncidentDetail } from "@/hooks/use-incidents";
import { useAuditEventDetail } from "@/hooks/use-audit";

const DETAIL_RESOURCE_TYPES = [
  "agents",
  "tasks",
  "tools",
  "policies",
  "approvals",
  "incidents",
  "audit",
] as const;

type DetailResourceType = (typeof DETAIL_RESOURCE_TYPES)[number];

function isDetailResourceType(value: string): value is DetailResourceType {
  return (DETAIL_RESOURCE_TYPES as readonly string[]).includes(value);
}

const NAV_LABEL_KEY_BY_HREF: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.href.slice(1), item.labelKey])),
);

/** One resolved name per possible detail resource, each `enabled` only
 * for the id that actually matches the current route — same "only one of
 * these is really active" shape as the rest of this console's find-by-id
 * hooks (hooks/use-agents.ts etc.), just fanned out across resource
 * types instead of pages. */
function useResolvedDetailName(
  resource: DetailResourceType | null,
  id: string | null,
): string | null {
  const idFor = (type: DetailResourceType) => (resource === type ? (id ?? "") : "");

  const agent = useAgentDetail(idFor("agents"));
  const task = useTaskDetail(idFor("tasks"));
  const tool = useToolDetail(idFor("tools"));
  const policy = usePolicyDetail(idFor("policies"));
  const approval = useApprovalDetail(idFor("approvals"));
  const incident = useIncidentDetail(idFor("incidents"));
  const audit = useAuditEventDetail(idFor("audit"));

  switch (resource) {
    case "agents":
      return agent.data?.displayName ?? null;
    case "tasks":
      return task.data?.name ?? null;
    case "tools":
      return tool.data?.name ?? null;
    case "policies":
      return policy.data?.name ?? null;
    case "approvals":
      return approval.data ? `${approval.data.toolId} · ${approval.data.actionId}` : null;
    case "incidents":
      return incident.data?.title ?? null;
    case "audit":
      return audit.data?.eventType ?? null;
    default:
      return null;
  }
}

/**
 * Wayfinding for `/x/[id]` detail pages (design-rework.md's Navigation
 * section), rendered in the Topbar: "Agents / SOC Response Agent"
 * instead of the console dropping the visitor onto a page with no sense
 * of where they are. Renders nothing on list/index pages — those are
 * still one hop from the sidebar, no trail needed there.
 */
export function Breadcrumbs() {
  const t = useTranslations("nav.items");
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const section = segments.length >= 2 ? segments[0] : null;
  const id = segments.length >= 2 ? segments[1] : null;
  const labelKey = section ? NAV_LABEL_KEY_BY_HREF[section] : undefined;
  const resource = section && isDetailResourceType(section) ? section : null;

  // Hooks must run unconditionally every render (this component lives in
  // the persistent Topbar, not remounted per route) — resolve the name
  // for every navigation, and only decide whether to render anything
  // afterwards.
  const resolvedName = useResolvedDetailName(resource, id);

  if (!section || !id || !labelKey) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
      <Link
        href={`/${section}`}
        className="rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {t(labelKey as "overview")}
      </Link>
      <ChevronRight
        className="size-3.5 shrink-0 text-muted-foreground-tertiary rtl:rotate-180"
        aria-hidden
      />
      <span className="truncate font-medium text-foreground" aria-current="page">
        {resolvedName ?? id}
      </span>
    </nav>
  );
}

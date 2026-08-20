"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bot,
  ListChecks,
  ShieldCheck,
  Wrench,
  Siren,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAgentsList } from "@/hooks/use-agents";
import { useTasksList } from "@/hooks/use-tasks";
import { usePoliciesList } from "@/hooks/use-policies";
import { useToolsList } from "@/hooks/use-tools";
import { useIncidentsList } from "@/hooks/use-incidents";
import { cn } from "@/lib/utils";

interface PaletteResult {
  id: string;
  name: string;
  href: string;
  kind: "agents" | "tasks" | "policies" | "tools" | "incidents";
}

const KIND_ICON: Record<PaletteResult["kind"], LucideIcon> = {
  agents: Bot,
  tasks: ListChecks,
  policies: ShieldCheck,
  tools: Wrench,
  incidents: Siren,
};

const MAX_RESULTS_PER_KIND = 6;

/**
 * Cmd+K quick-jump (design-rework.md's Navigation section): search
 * agents/tasks/policies/tools/incidents by name and jump straight to the
 * matched item's detail page. Client-side filter over each resource's
 * existing list endpoint (first page — this product's demo/foundation
 * scale, same "no new backend search endpoint" call the plan makes) —
 * no separate search API. Every list is fetched once the palette opens
 * (TanStack Query then caches it, so reopening is instant) rather than
 * eagerly on every page load.
 */
export function CommandPalette() {
  const t = useTranslations("commandPalette");
  const tNav = useTranslations("nav.items");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setQuery("");
  }

  const agents = useAgentsList();
  const tasks = useTasksList();
  const policies = usePoliciesList();
  const tools = useToolsList();
  const incidents = useIncidentsList();

  const allResults = useMemo<PaletteResult[]>(() => {
    const agentItems = agents.data?.pages[0]?.items ?? [];
    const taskItems = tasks.data?.pages[0]?.items ?? [];
    const policyItems = policies.data?.pages[0]?.items ?? [];
    const toolItems = tools.data?.pages[0]?.items ?? [];
    const incidentItems = incidents.data?.pages[0]?.items ?? [];

    return [
      ...agentItems.map((a): PaletteResult => ({
        id: a.id,
        name: a.displayName,
        href: `/agents/${a.id}`,
        kind: "agents",
      })),
      ...taskItems.map((tsk): PaletteResult => ({
        id: tsk.id,
        name: tsk.name,
        href: `/tasks/${tsk.id}`,
        kind: "tasks",
      })),
      ...policyItems.map((p): PaletteResult => ({
        id: p.id,
        name: p.name,
        href: `/policies/${p.id}`,
        kind: "policies",
      })),
      ...toolItems.map((tool): PaletteResult => ({
        id: tool.id,
        name: tool.name,
        href: `/tools/${tool.id}`,
        kind: "tools",
      })),
      ...incidentItems.map((i): PaletteResult => ({
        id: i.id,
        name: i.title,
        href: `/incidents/${i.id}`,
        kind: "incidents",
      })),
    ];
  }, [agents.data, tasks.data, policies.data, tools.data, incidents.data]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? allResults.filter((r) => r.name.toLowerCase().includes(q)) : allResults;
    const byKind = new Map<PaletteResult["kind"], PaletteResult[]>();
    for (const result of matches) {
      const list = byKind.get(result.kind) ?? [];
      if (list.length < MAX_RESULTS_PER_KIND) list.push(result);
      byKind.set(result.kind, list);
    }
    return byKind;
  }, [allResults, query]);

  const isLoading =
    agents.isPending ||
    tasks.isPending ||
    policies.isPending ||
    tools.isPending ||
    incidents.isPending;
  const totalMatches = Array.from(grouped.values()).reduce((sum, list) => sum + list.length, 0);

  function goTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">{t("trigger")}</span>
        <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-2xs sm:inline-block">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="top-24 w-[calc(100%-2rem)] max-w-md translate-y-0 p-0 sm:max-w-lg"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : totalMatches === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              Array.from(grouped.entries()).map(([kind, items]) => {
                const Icon = KIND_ICON[kind];
                return (
                  <div key={kind} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {tNav(kind as "agents")}
                    </div>
                    <ul>
                      {items.map((item) => (
                        <li key={`${item.kind}-${item.id}`}>
                          <button
                            type="button"
                            onClick={() => goTo(item.href)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-start text-sm transition-colors",
                              "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                            )}
                          >
                            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <span className="truncate text-foreground">{item.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

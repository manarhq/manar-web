"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  BroadcastIcon,
  CellTowerIcon,
  MagnifyingGlassIcon,
  RssIcon,
  TrashIcon,
  WifiSlashIcon,
} from "@phosphor-icons/react/ssr";

import { PageHeader } from "@/components/manar/page-header";
import { RiskBadge } from "@/components/manar/risk-badge";
import { EmptyState } from "@/components/manar/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLiveAuditFeed } from "@/hooks/use-live-audit-feed";
import { useActorNameResolver } from "@/hooks/use-actor-name";
import { EventTypeLabel } from "@/components/manar/event-type-label";
import { RISK_BANDS, type RiskBand } from "@/lib/risk";
import { cn } from "@/lib/utils";

function riskScoreOf(data: unknown): number | null {
  if (typeof data === "object" && data !== null && "riskScore" in data) {
    const value = (data as { riskScore?: unknown }).riskScore;
    return typeof value === "number" ? value : null;
  }
  return null;
}

const STATUS_ICON = {
  connecting: BroadcastIcon,
  open: CellTowerIcon,
  error: WifiSlashIcon,
} as const;

export function LiveFeedView() {
  const t = useTranslations("live");
  const tRisk = useTranslations("risk");
  const format = useFormatter();
  const { events, status, clear } = useLiveAuditFeed();
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBand | "ALL">("ALL");
  const resolveActorName = useActorNameResolver();

  // `.animate-event-arrive` (app/globals.css) is a state-change signal for
  // genuinely new events, not a flourish that should replay on every
  // re-render -- so it must NOT fire again just because the type/risk
  // filter changed and re-revealed an already-seen item. `/events/live`
  // (see useLiveAuditFeed's doc comment) sends only new events from the
  // moment the SSE connection opens, with no history replay, so any id
  // not present in the previous `events` snapshot really is a fresh
  // arrival. Diffed during render against `events` held from the
  // previous render (the "adjusting state when a prop changes" pattern
  // hooks/use-elapsed-seconds.ts also uses, comparing against state
  // rather than a ref, since this codebase's lint config forbids
  // reading/writing refs during render and flags calling `setState`
  // synchronously inside a `useEffect` body).
  const [prevEvents, setPrevEvents] = useState(events);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<ReadonlySet<string>>(new Set());

  if (events !== prevEvents) {
    const previousIds = new Set(prevEvents.map((event) => event.eventId));
    const arrived = new Set<string>();
    for (const event of events) {
      if (!previousIds.has(event.eventId)) arrived.add(event.eventId);
    }
    setNewlyArrivedIds(arrived);
    setPrevEvents(events);
  }

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter && !event.eventType.toLowerCase().includes(typeFilter.toLowerCase())) {
        return false;
      }
      if (riskFilter !== "ALL") {
        const score = riskScoreOf(event.data);
        if (score === null) return false;
        const band = RISK_BANDS.find((b) => score >= b.min && score <= b.max)?.band;
        if (band !== riskFilter) return false;
      }
      return true;
    });
  }, [events, typeFilter, riskFilter]);

  const StatusIcon = STATUS_ICON[status];

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <div className="flex items-center gap-2 text-xs">
            <StatusIcon
              className={cn(
                "size-3.5",
                status === "open" && "text-risk-minimal",
                status === "error" && "text-risk-critical",
                status === "connecting" && "animate-pulse text-muted-foreground",
              )}
              aria-hidden
            />
            <span className="text-muted-foreground">{t(`status.${status}`)}</span>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          placeholder={t("filters.typePlaceholder")}
          aria-label={t("filters.typeLabel")}
          className="w-64"
        />
        <Select
          value={riskFilter}
          onValueChange={(value) => setRiskFilter((value as RiskBand | "ALL") ?? "ALL")}
        >
          <SelectTrigger className="w-44" aria-label={t("filters.riskLabel")}>
            {/* Same fix as audit-list-view.tsx's Decision filter / approvals-
             * list-view.tsx's status filter: Base UI's SelectValue shows the
             * raw selected value ("minimal", "low", ...) unless given a
             * render function — this maps it back to the translated band
             * label its SelectItem uses. */}
            <SelectValue placeholder={t("filters.riskLabel")}>
              {(value: RiskBand | "ALL" | null) =>
                value ? (value === "ALL" ? t("filters.allRisk") : tRisk(value)) : null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allRisk")}</SelectItem>
            {RISK_BANDS.map((b) => (
              <SelectItem key={b.band} value={b.band}>
                {tRisk(b.band)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={clear}>
          <TrashIcon />
          {t("filters.clear")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("bufferNote", { count: events.length })}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border">
        {events.length === 0 ? (
          <EmptyState icon={RssIcon} description={t("empty")} className="h-full border-none" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MagnifyingGlassIcon}
            description={t("noMatch")}
            className="h-full border-none"
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((event) => {
              const score = riskScoreOf(event.data);
              return (
                <li
                  key={event.eventId}
                  className={cn(
                    "flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/50",
                    newlyArrivedIds.has(event.eventId) && "animate-event-arrive",
                  )}
                >
                  <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {format.dateTime(new Date(event.timestamp), {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span className="flex w-56 min-w-0 shrink-0 text-xs text-foreground">
                    <EventTypeLabel event={event} />
                  </span>
                  <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                    {resolveActorName(event.actor)}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                    {event.correlationId}
                  </span>
                  {score !== null && <RiskBadge score={score} className="shrink-0" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

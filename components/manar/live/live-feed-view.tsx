"use client";

import { useMemo, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Radio, RadioTower, WifiOff, TrashIcon, RssIcon, SearchXIcon } from "lucide-react";

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
import { humanizeEventType } from "@/lib/humanize-event-type";
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
  connecting: Radio,
  open: RadioTower,
  error: WifiOff,
} as const;

export function LiveFeedView() {
  const t = useTranslations("live");
  const format = useFormatter();
  const { events, status, clear } = useLiveAuditFeed();
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskBand | "ALL">("ALL");
  const resolveActorName = useActorNameResolver();

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
            <SelectValue placeholder={t("filters.riskLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allRisk")}</SelectItem>
            {RISK_BANDS.map((b) => (
              <SelectItem key={b.band} value={b.band}>
                {b.band}
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
            icon={SearchXIcon}
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
                  className="flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span className="w-36 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                    {format.dateTime(new Date(event.timestamp), {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </span>
                  <span
                    className="w-56 shrink-0 truncate text-xs text-foreground"
                    title={event.eventType}
                  >
                    {humanizeEventType(event.eventType)}
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

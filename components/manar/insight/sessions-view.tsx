"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessions } from "@/hooks/use-insight";
import { Link } from "@/i18n/navigation";
import type { SessionSummary } from "@/lib/insight/types";

const DAYS = 14;

export function SourceBadge({ source }: { source: SessionSummary["source"] }) {
  const t = useTranslations("insight.sessions");
  return (
    <Badge
      variant={source === "hook" ? "neutral" : "wait"}
      title={t(source === "hook" ? "sourceHookHint" : "sourceGapHint")}
    >
      {t(source === "hook" ? "sourceHook" : "sourceGap")}
    </Badge>
  );
}

function Row({ s }: { s: SessionSummary }) {
  const t = useTranslations("insight.sessions");
  const format = useFormatter();
  return (
    <li className="grid gap-1 border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/sessions/${s.id}` as never}
          className="text-sm font-medium text-blue-text hover:underline"
        >
          {s.toolName}
          {s.hostname ? ` · ${s.hostname}` : ""}
        </Link>
        <span className="text-xs text-muted-foreground">
          {format.dateTime(new Date(s.startedAt), { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("summary", {
          commands: s.counts.commands,
          files: s.counts.files,
          sites: s.counts.sites,
        })}
        {" · "}
        {t("asked", { count: s.counts.approvals })}
        {" · "}
        {t("blocked", { count: s.counts.blocked })}
      </p>
      <div>
        <SourceBadge source={s.source} />
      </div>
    </li>
  );
}

/** Sessions of the last two weeks, newest first. */
export function SessionsView() {
  const t = useTranslations("insight.sessions");
  const { data, isLoading, isError } = useSessions(DAYS);
  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      {isLoading ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-sm text-deny">
          {t("unavailable")}
        </p>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwiseIcon}
          title={t("emptyTitle")}
          description={t("empty")}
        />
      ) : (
        <section className="rounded-xl border border-border bg-card px-4">
          <p className="pt-3 text-xs text-muted-foreground">{t("range", { days: DAYS })}</p>
          <ul>
            {data.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

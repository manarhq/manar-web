"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/ssr";

import { EmptyState } from "@/components/manar/empty-state";
import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiTools } from "@/hooks/use-ai-tools";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessions } from "@/hooks/use-insight";
import { Link } from "@/i18n/navigation";
import type { SessionSummary } from "@/lib/insight/types";
import type { AiToolsDevice } from "@/lib/personal/ai-tools";

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
          tools: s.counts.tools,
          secrets: s.counts.secrets,
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

/**
 * Tools that could be recorded but are not: their commands never reach Manar, so a quiet list
 * must not read as "the tool did nothing". `waiting`: the owner's switch is on and the device has
 * not applied it (an older manar-edge, for one).
 */
export function unrecordedTools(devices: AiToolsDevice[] | undefined) {
  return (devices ?? []).flatMap((d) =>
    d.status !== "APPROVED"
      ? []
      : d.tools
          .filter((x) => !x.protected && x.supportedModes.includes("hook"))
          .map((x) => ({
            key: `${d.hostId}|${x.toolId}`,
            tool: x.name,
            device: d.hostname,
            waiting: x.desiredProtection,
          })),
  );
}

function Gaps({ gaps }: { gaps: ReturnType<typeof unrecordedTools> }) {
  const t = useTranslations("insight.sessions");
  if (gaps.length === 0) return null;
  return (
    <section role="status" className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-medium">{t("gapsTitle")}</h2>
      <ul className="grid gap-1 text-sm text-muted-foreground">
        {gaps.map((g) => (
          <li key={g.key}>
            {t(g.waiting ? "gapWaiting" : "gapOff", { tool: g.tool, device: g.device })}
          </li>
        ))}
      </ul>
      <Link href={"/ai-tools" as never} className="text-sm text-blue-text hover:underline">
        {t("gapsLink")}
      </Link>
    </section>
  );
}

/** Sessions of the last two weeks, newest first, 200 at a time. */
export function SessionsView() {
  const t = useTranslations("insight.sessions");
  const { data, isLoading, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSessions(DAYS);
  const gaps = unrecordedTools(useAiTools().data);
  return (
    <div className="grid gap-5">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <Gaps gaps={gaps} />
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
          description={t(gaps.length ? "emptyGaps" : "empty")}
        />
      ) : (
        <section className="rounded-xl border border-border bg-card px-4">
          <p className="pt-3 text-xs text-muted-foreground">{t("range", { days: DAYS })}</p>
          <ul>
            {data.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </ul>
          {hasNextPage && (
            <div className="border-t border-border py-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {t("more")}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useAuditSearch } from "@/hooks/use-audit";
import { useHostsList } from "@/hooks/use-hosts";
import { usePendingApprovals } from "@/hooks/use-pending-approvals-count";
import { summarizeTools } from "@/lib/personal/tool-stats";
import { BeamApprovalCard } from "@/components/manar/personal/beam-approval-card";
import { DevicesCard } from "@/components/manar/personal/devices-card";
import { SecretsCard, type SecretItem } from "@/components/manar/personal/secrets-card";
import {
  WeeklyReportCard,
  type WeeklyReport,
} from "@/components/manar/personal/weekly-report-card";
import { Skeleton } from "@/components/ui/skeleton";

export interface PersonalHomeProps {
  /** Secrets rows; the secrets track feeds these. Undefined shows the empty state. */
  secrets?: SecretItem[];
  /** Weekly totals; the features track feeds these. Undefined shows the empty state. */
  report?: WeeklyReport;
  onShareReport?: () => void;
  /** Show the 8 hour and make-a-rule buttons once the approvals track ships them. */
  extendedGrants?: boolean;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Personal Home (mockup "My AI home"): a one-sentence state of things, the beam approval card,
 * devices with per-tool chips, secrets and the weekly report. "Did N things today" counts audit
 * events with a decision since local midnight, first page only: more than one page reads "at
 * least N".
 */
export function PersonalHome({
  secrets,
  report,
  onShareReport,
  extendedGrants,
}: PersonalHomeProps) {
  const t = useTranslations("personal.home");
  const todayFrom = useMemo(() => startOfTodayIso(), []);
  const audit = useAuditSearch({ from: todayFrom });
  const hosts = useHostsList({});
  const pending = usePendingApprovals();

  const auditPage = audit.data?.pages[0];
  const actions = (auditPage?.items ?? []).filter((e) => e.decision);
  const hostItems = useMemo(() => hosts.data?.pages.flatMap((p) => p.items) ?? [], [hosts.data]);
  const toolsByHost = useMemo(
    () => summarizeTools(auditPage?.items ?? [], pending.items),
    [auditPage, pending.items],
  );

  const loadingState = audit.isLoading || pending.isLoading;
  const waiting = pending.count;

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-medium text-foreground sm:text-3xl" aria-live="polite">
        {loadingState ? (
          <Skeleton className="h-9 w-2/3" aria-busy />
        ) : audit.isError ? (
          t("unavailable")
        ) : (
          <>
            {actions.length === 0
              ? t("quiet")
              : t(auditPage?.nextCursor ? "didTodayMore" : "didToday", {
                  count: actions.length,
                })}{" "}
            <span className={waiting > 0 ? "text-orange-text" : "text-muted-foreground"}>
              {waiting > 0 ? t("needsYes", { count: waiting }) : t("nothingNeeds")}
            </span>
          </>
        )}
      </h1>

      {pending.items[0] && (
        <BeamApprovalCard
          key={pending.items[0].id}
          approval={pending.items[0]}
          moreCount={waiting - 1}
          extendedGrants={extendedGrants}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <DevicesCard
          hosts={hostItems}
          toolsByHost={toolsByHost}
          isLoading={hosts.isLoading}
          unavailable={hosts.isError}
        />
        <div className="grid content-start gap-5">
          <SecretsCard items={secrets} />
          <WeeklyReportCard report={report} onShare={onShareReport} />
        </div>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArchiveIcon, ArrowLeftIcon, LockIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { ApiErrorPanel } from "@/components/manar/api-error-state";
import { isNotFoundError } from "@/lib/api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { AiSystemLifecycleBadge } from "@/components/manar/ai-systems/ai-system-lifecycle-badge";
import { CoveragePanel } from "@/components/manar/ai-systems/coverage-panel";
import { AiSystemTransitionControl } from "@/components/manar/ai-systems/ai-system-transition-control";
import { AiSystemLinksPanel } from "@/components/manar/ai-systems/ai-system-links-panel";
import { AiSystemHistory } from "@/components/manar/ai-systems/ai-system-history";
import { EditAiSystemDialog } from "@/components/manar/ai-systems/edit-ai-system-dialog";
import { useUserNameResolver } from "@/components/manar/ai-systems/user-name";
import { useAiSystemDetail } from "@/hooks/use-ai-systems";

function Field({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
      {hint && <p className="mt-0.5 text-2xs text-muted-foreground-tertiary">{hint}</p>}
    </div>
  );
}

/** A value the owner *declared* and Manar never verified. Marked as such
 * at the point of display rather than only in a footnote, and rendered as
 * an explicit "not recorded" when absent — an empty cell would read as a
 * value of nothing rather than an absent declaration. */
function DeclaredValue({ value }: { value: string | null }) {
  const t = useTranslations("aiSystems");
  if (!value) {
    return <span className="text-muted-foreground italic">{t("notRecorded")}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span>{value}</span>
      <span className="rounded-sm bg-muted px-1 py-px text-2xs text-muted-foreground">
        {t("declaredLabel")}
      </span>
    </span>
  );
}

export function AiSystemDetailView({
  aiSystemId,
  canManage,
}: {
  aiSystemId: string;
  canManage: boolean;
}) {
  const t = useTranslations("aiSystems.detail");
  const tSystems = useTranslations("aiSystems");
  const format = useFormatter();
  const resolveUserName = useUserNameResolver();
  const { data: system, isPending, isError, error } = useAiSystemDetail(aiSystemId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError && !isNotFoundError(error)) {
    return <ApiErrorPanel title={tSystems("title")} error={error} />;
  }
  if (isError || !system) {
    return <NotFoundPanel title={tSystems("title")} body={t("notFoundBody")} />;
  }

  const retired = system.lifecycleState === "RETIRED";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={system.name}
        description={system.businessPurpose}
        actions={canManage && !retired ? <EditAiSystemDialog system={system} /> : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/ai-systems"
          className="inline-flex w-fit items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
          {t("backToList")}
        </Link>
        <AiSystemLifecycleBadge state={system.lifecycleState} />
        <span className="font-data text-xs text-muted-foreground-tertiary">{system.slug}</span>
      </div>

      {!canManage && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <LockIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {tSystems("readOnlyNotice")}
        </p>
      )}

      {retired && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          <ArchiveIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          {t("retiredNotice")}
        </p>
      )}

      {/* Coverage leads the record: it is the one thing on this page the
       * operator cannot get from the form that created it. */}
      <CoveragePanel coverage={system.coverage} />

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("name")} value={system.name} />
          <Field
            label={t("slug")}
            value={<span className="font-data">{system.slug}</span>}
            hint={t("slugHint")}
          />
          <Field label={t("owner")} value={resolveUserName(system.ownerId)} />
          <Field label={t("businessUnit")} value={system.businessUnit} />
          <Field label={t("environment")} value={tSystems(`environment.${system.environment}`)} />
          <Field
            label={t("dataClassification")}
            value={tSystems(`dataClassification.${system.dataClassification}`)}
          />
          <Field
            label={t("declaredProvider")}
            value={<DeclaredValue value={system.declaredProvider} />}
          />
          <Field
            label={t("declaredModel")}
            value={<DeclaredValue value={system.declaredModel} />}
          />
          <Field
            label={t("nextReviewDate")}
            // `null` is UNSCHEDULED — a real state, and explicitly not the
            // same claim as "not due".
            value={
              system.nextReviewDate ? (
                <span className="font-data">
                  {format.dateTime(new Date(system.nextReviewDate), { dateStyle: "medium" })}
                </span>
              ) : (
                <span className="text-muted-foreground italic">{tSystems("unscheduled")}</span>
              )
            }
            hint={system.nextReviewDate ? undefined : tSystems("unscheduledHint")}
          />
          <Field
            label={t("version")}
            value={<span className="font-data">v{system.version}</span>}
          />
          <Field label={t("createdBy")} value={resolveUserName(system.createdBy)} />
          <Field
            label={t("createdAt")}
            value={
              <span className="font-data">
                {format.dateTime(new Date(system.createdAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            }
          />
          <Field
            label={t("updatedAt")}
            value={
              <span className="font-data">
                {format.dateTime(new Date(system.updatedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            }
          />
          <Field
            label={t("businessPurpose")}
            value={system.businessPurpose}
            className="sm:col-span-2 lg:col-span-3"
          />
          <Field
            label={t("riskRationale")}
            value={system.riskRationale}
            className="sm:col-span-2 lg:col-span-3"
          />
        </dl>
        <p className="mt-3 max-w-prose text-2xs text-muted-foreground-tertiary">
          {tSystems("declaredHint")}
        </p>
      </section>

      <AiSystemTransitionControl
        aiSystemId={system.id}
        currentState={system.lifecycleState}
        canManage={canManage}
      />

      <AiSystemLinksPanel
        aiSystemId={system.id}
        linkedAgents={system.linkedAgents}
        linkedTools={system.linkedTools}
        coverage={system.coverage.coverage}
        canManage={canManage}
      />

      <AiSystemHistory aiSystemId={system.id} />
    </div>
  );
}

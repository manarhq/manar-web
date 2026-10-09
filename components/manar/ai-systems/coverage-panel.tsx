"use client";

import { useFormatter, useTranslations } from "next-intl";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";
import type { AiSystemCoverage } from "@/hooks/use-ai-systems";
import { CoverageBadge } from "@/components/manar/ai-systems/coverage-badge";
import {
  COVERAGE_HATCH_STYLE,
  coverageFacts,
  coveragePresentation,
  observationFiguresAreMeasurements,
  type CoverageFact,
} from "@/components/manar/ai-systems/coverage";

/**
 * The coverage verdict *and* the evidence behind it, on one screen.
 *
 * A badge an operator cannot interrogate is the failure mode this panel
 * exists to avoid, so `AiSystemCoverageDto`'s counts, `lastObservedAt`
 * and `observationWindowDays` — which the API ships alongside the verdict
 * specifically so the UI can explain it without a second request — are
 * all rendered here rather than dropped.
 *
 * Under `MONITORING_UNAVAILABLE` the observation figures are shown as
 * withheld, never as zero/never: the API zeroes them deliberately because
 * the source could not be consulted, and printing that zero would turn a
 * platform outage into a finding about the system.
 */
function FactValue({ fact }: { fact: CoverageFact }) {
  const t = useTranslations("aiSystems.coverage");
  const format = useFormatter();

  if (fact.kind === "unavailable") {
    return (
      <span
        data-slot="coverage-fact-unavailable"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive"
        title={t("figureUnavailableHint")}
      >
        <WarningIcon className="size-3.5" aria-hidden />
        {t("figureUnavailable")}
      </span>
    );
  }

  if (fact.kind === "never") {
    return <span className="text-sm text-muted-foreground">{t("neverObserved")}</span>;
  }

  if (fact.kind === "timestamp") {
    return (
      <span className="font-data text-sm text-foreground">
        {format.dateTime(new Date(fact.timestamp as string), {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </span>
    );
  }

  if (fact.key === "window") {
    return (
      <span className="text-sm text-foreground">
        {t("windowValue", { count: fact.count ?? 0 })}
      </span>
    );
  }

  return <span className="font-data text-sm text-foreground">{fact.count ?? 0}</span>;
}

export function CoveragePanel({
  coverage,
  className,
}: {
  coverage: AiSystemCoverage;
  className?: string;
}) {
  const t = useTranslations("aiSystems.coverage");
  const presentation = coveragePresentation(coverage.coverage);
  const facts = coverageFacts(coverage);
  const measured = observationFiguresAreMeasurements(coverage.coverage);

  return (
    <section
      data-slot="coverage-panel"
      data-coverage={coverage.coverage}
      data-coverage-surface={presentation.surface}
      className={cn("rounded-lg border border-border bg-card p-4", className)}
      aria-labelledby="coverage-panel-title"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="coverage-panel-title" className="text-sm font-semibold text-foreground">
          {t("title")}
        </h2>
        <CoverageBadge coverage={coverage.coverage} />
      </div>

      <p className="max-w-prose text-sm text-foreground">{t(`${coverage.coverage}.meaning`)}</p>

      {!measured && (
        <div
          role="status"
          data-slot="coverage-unavailable-alert"
          style={COVERAGE_HATCH_STYLE}
          className="mt-3 flex items-start gap-2.5 rounded-lg border border-destructive/60 bg-destructive/10 p-3"
        >
          <WarningIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-destructive">{t("unavailableAlertTitle")}</p>
            <p className="max-w-prose text-sm text-foreground">{t("unavailableAlertBody")}</p>
          </div>
        </div>
      )}

      <h3 className="mt-4 mb-1 text-xs font-medium text-muted-foreground">{t("factsTitle")}</h3>
      <p className="mb-2 max-w-prose text-xs text-muted-foreground-tertiary">{t("factsHint")}</p>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.key} className="flex flex-col gap-0.5" data-coverage-fact={fact.key}>
            <dt className="text-xs font-medium text-muted-foreground">{t(`facts.${fact.key}`)}</dt>
            <dd>
              <FactValue fact={fact} />
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 max-w-prose text-xs text-muted-foreground-tertiary">
        {t("activeAgentsNote")}
      </p>
      <p className="mt-1.5 max-w-prose text-xs text-muted-foreground-tertiary">
        {t("derivedNote")} {t("notAScale")}
      </p>
    </section>
  );
}

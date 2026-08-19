"use client";

import { useTranslations } from "next-intl";
import { Sparkles, CircleAlert, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSummarizeIncident } from "@/hooks/use-incident-summarize";
import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * The "Summarize with AI" feature (design-rework.md): a button calling
 * `POST /incidents/summarize` for this one incident. The result is
 * advisory-only and never persisted onto the `Incident` (manar-api
 * deliberately never writes it back, per its own doc comment) — this
 * panel makes that explicit with a standing label rather than any
 * "saved"/checkmark affordance, and re-running the summary is always a
 * fresh call, never a cached "already summarized" state.
 */
export function IncidentSummarizePanel({ incidentId }: { incidentId: string }) {
  const t = useTranslations("incidents.summarize");
  const mutation = useSummarizeIncident();
  const elapsedSeconds = useElapsedSeconds(mutation.isPending);

  return (
    <section className="rounded-lg border border-dashed border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          {t("title")}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => mutation.mutate(incidentId)}
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? t("summarizing")
            : mutation.isSuccess
              ? t("regenerate")
              : t("summarize")}
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t("advisoryNote")}</p>

      {mutation.isPending && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
          <span>{t("inProgressHint", { seconds: elapsedSeconds })}</span>
        </div>
      )}

      {mutation.isError && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{apiErrorMessage(mutation.error, t("requestError"))}</span>
        </div>
      )}

      {mutation.isSuccess && !mutation.data.available && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t("unavailable")}</span>
        </div>
      )}

      {mutation.isSuccess && mutation.data.available && mutation.data.result && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-border bg-card p-3 text-sm">
          <div className="rounded-sm bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {t("aiGeneratedBadge")}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("summaryLabel")}</span>
            <p className="text-foreground">{mutation.data.result.summary}</p>
          </div>
          {mutation.data.result.keyEvents.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("keyEventsLabel")}
              </span>
              <ul className="list-inside list-disc text-sm text-foreground">
                {mutation.data.result.keyEvents.map((event, index) => (
                  <li key={`${index}-${event}`}>{event}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">{t("rootCauseLabel")}</span>
            <p className="text-foreground">{mutation.data.result.probableRootCause}</p>
          </div>
          {mutation.data.result.recommendedNextSteps.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("nextStepsLabel")}
              </span>
              <ul className="list-inside list-disc text-sm text-foreground">
                {mutation.data.result.recommendedNextSteps.map((step, index) => (
                  <li key={`${index}-${step}`}>{step}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
            <span>
              {t("confidence", { value: Math.round(mutation.data.result.confidence * 100) })}
            </span>
            <span>{t("contextCount", { count: mutation.data.contextEventCount })}</span>
          </div>
          <p className="text-xs text-muted-foreground">{mutation.data.result.explanation}</p>
        </div>
      )}
    </section>
  );
}

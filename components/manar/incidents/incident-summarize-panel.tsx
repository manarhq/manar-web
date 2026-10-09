"use client";

import { useTranslations } from "next-intl";
import { CircleNotchIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

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
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <SparkleIcon className="size-4 text-muted-foreground" aria-hidden />
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
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <CircleNotchIcon className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
          <span>{t("inProgressHint", { seconds: elapsedSeconds })}</span>
        </div>
      )}

      {mutation.isError && (
        // Measured (WCAG relative-luminance, real getComputedStyle
        // values, not eyeballed): text-destructive vs bg-card tops out at
        // 4.53:1 with zero fill and drops under 4.5:1 the moment any
        // bg-destructive/N tint is blended in (the destructive token's
        // own contrast margin against this panel's card/card-raised/
        // popover surfaces is too thin to survive alpha compositing).
        // The message text uses text-foreground (guaranteed-legible in
        // both themes) instead; text-destructive stays on the icon only,
        // a decorative cue that only needs the 3:1 non-text threshold.
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
          <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>{apiErrorMessage(mutation.error, t("requestError"))}</span>
        </div>
      )}

      {mutation.isSuccess && !mutation.data.available && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <SparkleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t("unavailable")}</span>
        </div>
      )}

      {mutation.isSuccess && mutation.data.available && mutation.data.result && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-card-raised p-3 text-sm">
          {/* The one consistent "this is advisory AI output, not a stored
           * fact" visual signature shared across all three AI panels —
           * see incident-summarize-panel.tsx/audit-investigate-panel.tsx/
           * suggest-policy-dialog.tsx. Deliberately neutral (border-border/
           * text-muted-foreground, no --primary or --state-safe fill):
           * constraint 6/2 forbids marking "AI succeeded" with the
           * interactive accent or the verified/success green, since
           * advisory output is neither. The Sparkle icon (echoing the
           * panel header) is the recognizable cue instead of color. */}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            <SparkleIcon className="size-3" aria-hidden />
            {t("aiGeneratedBadge")}
          </span>
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

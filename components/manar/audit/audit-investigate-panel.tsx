"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CircleNotchIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInvestigateAudit } from "@/hooks/use-audit-investigate";
import type { AuditFilters } from "@/hooks/use-audit";
import { useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * The "Ask a question" AI-investigate feature (design-rework.md): a
 * free-text question, scoped by whichever `AuditFilters` the audit page
 * already has applied, sent to `POST /audit/investigate`. Answers are
 * grounded only in the tenant-scoped events manar-api itself retrieved —
 * never fabricated — and `available: false` renders as a calm "no AI
 * response right now" state, never an error (Section 26's fail-safe
 * philosophy, mirrored in the UI).
 */
export function AuditInvestigatePanel({ filters }: { filters: AuditFilters }) {
  const t = useTranslations("audit.investigate");
  const [question, setQuestion] = useState("");
  const mutation = useInvestigateAudit();
  const elapsedSeconds = useElapsedSeconds(mutation.isPending);

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <SparkleIcon className="size-4 text-muted-foreground" aria-hidden />
        {t("title")}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        {activeFilterCount > 0 ? t("scopeHint", { count: activeFilterCount }) : t("scopeHintAll")}
      </p>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = question.trim();
          if (!trimmed) return;
          mutation.mutate({ question: trimmed, filters });
        }}
      >
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("title")}
          maxLength={2000}
          className="min-h-9 flex-1 resize-none"
          rows={1}
        />
        <Button type="submit" size="sm" disabled={mutation.isPending || !question.trim()}>
          {mutation.isPending ? t("asking") : t("ask")}
        </Button>
      </form>

      {mutation.isPending && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <CircleNotchIcon
            className="size-4 shrink-0 animate-spin text-muted-foreground"
            aria-hidden
          />
          <span>{t("inProgressHint", { seconds: elapsedSeconds })}</span>
        </div>
      )}

      {mutation.isError && (
        // Same measured contrast fix as incident-summarize-panel.tsx —
        // text-destructive vs this panel's card/card-raised backgrounds
        // drops under 4.5:1 once the bg-destructive/5 fill blends in
        // (real computed-style measurement, not eyeballed). Message text
        // uses text-foreground; text-destructive stays on the icon only.
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
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-card-raised p-3 text-sm">
          {/* Same advisory-marking pill as incident-summarize-panel.tsx/
           * suggest-policy-dialog.tsx — see that file's comment for why
           * it's deliberately neutral (no --primary/--state-safe). */}
          <span className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
            <SparkleIcon className="size-3" aria-hidden />
            {t("aiGeneratedBadge")}
          </span>
          <p className="text-foreground">{mutation.data.result.answer}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              {t("confidence", { value: Math.round(mutation.data.result.confidence * 100) })}
            </span>
            <span>{t("contextCount", { count: mutation.data.contextEventCount })}</span>
          </div>
          {mutation.data.result.citations.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("citations")}</span>
              {/* Citations are technical identifiers (event/correlation
               * IDs), forced LTR regardless of page locale — same bidi
               * fix as audit-detail-view.tsx's raw evidence block and
               * policy-detail-view.tsx's JSON/YAML dump: under dir="rtl"
               * the browser can misplace trailing neutral punctuation in
               * an unwrapped technical string. */}
              <ul dir="ltr" className="flex flex-col gap-0.5">
                {mutation.data.result.citations.map((citation, index) => (
                  <li
                    key={`${index}-${citation}`}
                    className="font-mono text-xs text-muted-foreground"
                  >
                    {citation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{mutation.data.result.explanation}</p>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useInvestigateAudit } from "@/hooks/use-audit-investigate";
import type { AuditFilters } from "@/hooks/use-audit";
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

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;

  return (
    <section className="rounded-lg border border-dashed border-border p-4">
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Sparkles className="size-4 text-primary" aria-hidden />
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
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-card p-3 text-sm">
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
              <ul className="flex flex-col gap-0.5">
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

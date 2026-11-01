"use client";

import { useLocale, useTranslations } from "next-intl";

import type { QueueApproval } from "@/hooks/use-answer-approval";

/**
 * What could go wrong, in plain words. The text is written by manar-api's deterministic templates
 * (never a model) in both languages, so the console and the WARDEN prompt say the same thing. A
 * device approval also says what happens when nobody answers (denied after 2 minutes).
 */
export function ApprovalExplanation({ approval }: { approval: QueueApproval }) {
  const t = useTranslations("personal.approval");
  const locale = useLocale();
  const text = approval.explanation?.[locale === "ar" ? "ar" : "en"];
  if (!text && approval.kind !== "host") return null;
  return (
    <div className="grid max-w-prose gap-1">
      {text && (
        <p className="text-sm text-foreground" data-testid="risk-explanation">
          <span className="font-medium">{t("explainLabel")}</span> {text}
        </p>
      )}
      {approval.kind === "host" && (
        <p className="text-xs text-muted-foreground">{t("noAnswerNote")}</p>
      )}
    </div>
  );
}

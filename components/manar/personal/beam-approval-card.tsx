"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { QueueApproval } from "@/hooks/use-answer-approval";
import { ApprovalCard } from "@/components/manar/approvals/approval-card";

export interface BeamApprovalCardProps {
  /** The oldest pending approval (from an agent task, or `kind: "host"` from a device). */
  approval: QueueApproval;
  /** How many more are waiting behind it. */
  moreCount?: number;
  /** Show "Approve for 8 hours" and "Approve + make rule" (the `extendedGrants` flag). */
  extendedGrants?: boolean;
}

/**
 * The beam: the one thing on Home that needs a person. A 5px orange bar on the start edge sweeps
 * in over 400 ms when a new request arrives (off under reduced motion, see globals.css).
 * Keyboard: A approves once (never a longer grant), D denies; see hooks/use-decision-keys.ts for
 * the safety rules.
 */
export function BeamApprovalCard({
  approval,
  moreCount = 0,
  extendedGrants = false,
}: BeamApprovalCardProps) {
  const t = useTranslations("personal.approval");
  const format = useFormatter();
  return (
    <section
      aria-labelledby="beam-title"
      data-testid="beam-approval-card"
      className="relative grid gap-3 overflow-hidden rounded-xl border border-border bg-card py-4 ps-6 pe-5"
    >
      <span
        aria-hidden
        className="animate-beam-sweep absolute inset-y-0 start-0 w-[5px] origin-top bg-orange"
      />
      <div className="flex flex-wrap justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {t("eyebrow")} · {format.dateTime(new Date(approval.requestedAt), { timeStyle: "short" })}
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          {t("approveKey")} <kbd className="kbd">A</kbd> {t("denyKey")} <kbd className="kbd">D</kbd>
        </span>
      </div>
      <ApprovalCard approval={approval} extendedGrants={extendedGrants} titleId="beam-title" />
      {moreCount > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("more", { count: moreCount })} ·{" "}
          <Link href="/approvals" className="link-text">
            {t("all")}
          </Link>
        </p>
      )}
    </section>
  );
}

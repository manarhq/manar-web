"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { ComplianceMappingStatus } from "@/hooks/use-compliance";

/**
 * Four distinct tones for four distinct honest states (Section 55) — this
 * is the one place this whole page's "don't overstate coverage"
 * requirement actually lives. `MAPPED` is the only tone that reads as
 * unambiguously good (a real, built, evidenced capability); the other
 * three are deliberately NOT green — `EVIDENCE_AVAILABLE` (real evidence
 * exists but falls short of a full mapping) gets the same neutral-blue
 * "info" tone `RiskBadge`'s low band uses, `PARTIALLY_IMPLEMENTED` gets
 * the same amber "warning" tone as an incomplete/at-risk state everywhere
 * else in this product, and `NOT_EVALUATED` gets plain gray — not a
 * judgment, just "nobody has assessed this yet." No status here ever
 * renders as a checkmark/tick icon — a bare colored label only, so this
 * page cannot accidentally read as "all green, fully compliant" the way
 * a checklist-with-ticks treatment would.
 */
const TONE: Record<ComplianceMappingStatus, StatusTone> = {
  MAPPED: "positive",
  EVIDENCE_AVAILABLE: "info",
  PARTIALLY_IMPLEMENTED: "warning",
  NOT_EVALUATED: "neutral",
};

export function ComplianceStatusBadge({ status }: { status: ComplianceMappingStatus }) {
  const t = useTranslations("compliance.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { AiSystemLifecycleState } from "@/hooks/use-ai-systems";

/**
 * Lifecycle state, on the console's shared `StatusBadge` tone vocabulary
 * — the same treatment agents/tasks/policies/approvals already use, so a
 * lifecycle state reads the same way everywhere.
 *
 * Note this is the *opposite* choice from `CoverageBadge`, which
 * deliberately does not use `StatusBadge`: a lifecycle state genuinely is
 * a "how is this record doing" scale (active is better than suspended),
 * which is what these tones mean. Coverage is not that, and is drawn
 * with its own vocabulary in `./coverage.ts`.
 */
const TONE: Record<AiSystemLifecycleState, StatusTone> = {
  DRAFT: "neutral",
  REVIEW: "info",
  ACTIVE: "positive",
  SUSPENDED: "warning",
  RETIRED: "neutral",
};

export function AiSystemLifecycleBadge({ state }: { state: AiSystemLifecycleState }) {
  const t = useTranslations("aiSystems.lifecycleState");
  return <StatusBadge tone={TONE[state]}>{t(state)}</StatusBadge>;
}

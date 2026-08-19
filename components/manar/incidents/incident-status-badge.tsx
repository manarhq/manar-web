"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { IncidentStatus } from "@/hooks/use-incidents";

/** OPEN reads as "needs attention" (warning), INVESTIGATING as active/
 * in-progress (info), RESOLVED as done (positive), CLOSED as archived
 * (neutral) — the real `OPEN -> INVESTIGATING -> RESOLVED -> CLOSED`
 * lifecycle (Section 70), same tone language `StatusBadge` already uses
 * everywhere else (Section 58). */
const TONE: Record<IncidentStatus, StatusTone> = {
  OPEN: "warning",
  INVESTIGATING: "info",
  RESOLVED: "positive",
  CLOSED: "neutral",
};

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const t = useTranslations("incidents.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

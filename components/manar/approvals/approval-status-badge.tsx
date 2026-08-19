"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { ApprovalStatus } from "@/hooks/use-approvals";

const TONE: Record<ApprovalStatus, StatusTone> = {
  PENDING: "warning",
  APPROVED: "positive",
  DENIED: "negative",
  EXPIRED: "neutral",
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const t = useTranslations("approvals.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

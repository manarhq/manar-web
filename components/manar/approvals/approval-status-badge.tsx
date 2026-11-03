"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { ApprovalStatus } from "@/hooks/use-approvals";

const TONE: Record<string, StatusTone> = {
  PENDING: "warning",
  APPROVED: "positive",
  DENIED: "negative",
  EXPIRED: "neutral",
  REVOKED: "negative",
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus | "REVOKED" }) {
  const t = useTranslations("approvals.status");
  return <StatusBadge tone={TONE[status] ?? "neutral"}>{t(status)}</StatusBadge>;
}

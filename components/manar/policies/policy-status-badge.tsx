"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { PolicyVersion } from "@/hooks/use-policies";

const TONE: Record<PolicyVersion["status"], StatusTone> = {
  DRAFT: "neutral",
  PUBLISHED: "positive",
};

export function PolicyVersionStatusBadge({ status }: { status: PolicyVersion["status"] }) {
  const t = useTranslations("policies.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

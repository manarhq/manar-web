"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { AgentStatus } from "@/hooks/use-agents";

const TONE: Record<AgentStatus, StatusTone> = {
  PENDING_ENROLLMENT: "warning",
  ACTIVE: "positive",
  REVOKED: "neutral",
  KILLED: "negative",
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const t = useTranslations("agents.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

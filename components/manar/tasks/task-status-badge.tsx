"use client";

import { useTranslations } from "next-intl";

import { StatusBadge, type StatusTone } from "@/components/manar/status-badge";
import type { TaskStatus } from "@/hooks/use-tasks";

const TONE: Record<TaskStatus, StatusTone> = {
  PENDING: "info",
  ACTIVE: "positive",
  EXPIRED: "neutral",
  REVOKED: "negative",
  COMPLETED: "neutral",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const t = useTranslations("tasks.status");
  return <StatusBadge tone={TONE[status]}>{t(status)}</StatusBadge>;
}

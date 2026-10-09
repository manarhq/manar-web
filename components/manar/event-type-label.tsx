"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/manar/status-badge";
import { humanizeEventType } from "@/lib/humanize-event-type";

export interface EventLike {
  eventType: string;
  data?: unknown;
}

/**
 * A tool invocation whose answer was lost (timeout, dropped connection on
 * a mutating/destructive call). manar-api records it as status UNKNOWN and
 * `tool.invocation.outcome_unknown`: neither success nor failure.
 */
export function isOutcomeUnknown(event: EventLike): boolean {
  if (event.eventType === "tool.invocation.outcome_unknown") return true;
  const status = (event.data as { status?: unknown } | null | undefined)?.status;
  return event.eventType.startsWith("tool.invocation.") && status === "UNKNOWN";
}

/** Humanized event type, plus an explicit "needs reconciliation" badge for
 * an UNKNOWN invocation outcome so it never reads as success or failure. */
export function EventTypeLabel({ event }: { event: EventLike }) {
  const t = useTranslations("audit.outcomeUnknown");
  const tLabels = useTranslations("audit.eventLabels");
  const labelKey = event.eventType.replaceAll(".", "_");
  const label = tLabels.has(labelKey) ? tLabels(labelKey) : humanizeEventType(event.eventType);
  const unknown = isOutcomeUnknown(event);
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1.5" title={event.eventType}>
      <span className="truncate">{label}</span>
      {unknown && (
        <StatusBadge tone="warning" className="shrink-0">
          <span title={t("hint")}>{t("label")}</span>
          <span className="sr-only">: {t("hint")}</span>
        </StatusBadge>
      )}
    </span>
  );
}

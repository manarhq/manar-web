"use client";

import { WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";

import { classifyApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/manar/page-header";

export interface ApiErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}

/**
 * A failed read, stated as a failure (GATE-0 S50/S51): "monitoring
 * unavailable" with the HTTP status and manar-api's reason code, so a
 * dependency outage never renders as zero, empty or "does not exist".
 * Callers keep 404 on `NotFoundPanel` (see `isNotFoundError`).
 */
export function ApiErrorState({ error, onRetry, className }: ApiErrorStateProps) {
  const t = useTranslations("common.apiError");
  const tActions = useTranslations("common.actions");
  const failure = classifyApiError(error);
  const kind = failure.kind === "notFound" ? "unavailable" : failure.kind;

  return (
    <div
      role="alert"
      data-testid="api-error-state"
      data-kind={kind}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm",
        className,
      )}
    >
      <span className="flex items-center gap-2 font-medium text-destructive">
        <WarningCircleIcon className="size-4 shrink-0" aria-hidden />
        {t(`${kind}.title`)}
      </span>
      <span className="text-muted-foreground">{t(`${kind}.body`)}</span>
      <span className="font-data text-xs text-foreground">
        {failure.status !== undefined ? t("status", { status: failure.status }) : t("noResponse")}
        {failure.reason && <> · {t("reason", { reason: failure.reason })}</>}
      </span>
      {onRetry && (
        <Button size="xs" variant="outline" onClick={onRetry} className="mt-1">
          {tActions("retry")}
        </Button>
      )}
    </div>
  );
}

/** Full-page variant for detail views. */
export function ApiErrorPanel({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <ApiErrorState error={error} className="py-8" />
    </div>
  );
}

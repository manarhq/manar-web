"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useUpdateIncident, type IncidentStatus } from "@/hooks/use-incidents";
import { apiErrorMessage } from "@/lib/api/errors";

/** The real lifecycle (Section 70) — manar-api's own `PATCH /incidents/:id`
 * doesn't reject an out-of-order status value (any of the four enum
 * values is technically legal), but this console only ever offers the
 * single next step in this fixed order, so the UI itself never invites a
 * transition the lifecycle doesn't intend — no "jump straight to CLOSED"
 * button, no going backward. */
const LIFECYCLE: IncidentStatus[] = ["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"];

function nextStatus(current: IncidentStatus): IncidentStatus | null {
  const index = LIFECYCLE.indexOf(current);
  return index >= 0 && index < LIFECYCLE.length - 1 ? LIFECYCLE[index + 1] : null;
}

export function IncidentStatusTransition({
  incidentId,
  status,
}: {
  incidentId: string;
  status: IncidentStatus;
}) {
  const t = useTranslations("incidents.detail");
  const tStatus = useTranslations("incidents.status");
  const update = useUpdateIncident(incidentId);
  const next = nextStatus(status);

  if (!next) {
    return <p className="text-xs text-muted-foreground">{t("lifecycleClosed")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { status: next },
            {
              onSuccess: () => toast.success(t("transitionSuccess", { status: tStatus(next) })),
              onError: () => toast.error(t("transitionError")),
            },
          )
        }
      >
        <ArrowRightIcon />
        {t("advanceTo", { status: tStatus(next) })}
      </Button>
      {update.isPending && (
        <span className="text-xs text-muted-foreground">{t("transitioning")}</span>
      )}
      {update.isError && (
        <p className="text-sm text-destructive">{apiErrorMessage(update.error)}</p>
      )}
    </div>
  );
}

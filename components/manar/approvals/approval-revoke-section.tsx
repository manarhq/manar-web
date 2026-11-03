"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { RevokeDialog } from "@/components/manar/approvals/approvals-list-view";
import { Button } from "@/components/ui/button";

/** On the detail page: who revoked it and whether it had been used, or the Revoke button. */
export function ApprovalRevokeSection({
  approval,
}: {
  approval: {
    id: string;
    status: string;
    canRevoke?: boolean;
    releasedAt?: string | null;
    grantConsumedAt?: string | null;
    revokedAt?: string | null;
    revokedByName?: string | null;
    usedBeforeRevoke?: boolean | null;
  };
}) {
  const t = useTranslations("approvals.history");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  if (approval.revokedAt) {
    return (
      <section
        className="rounded-lg border border-border bg-card p-4 text-sm"
        data-testid="revoked"
      >
        <p className="font-medium">
          {t(approval.usedBeforeRevoke ? "state.revokedAfterUse" : "state.cancelledBeforeUse")}
        </p>
        <p className="text-muted-foreground">
          {t("revokedBy", {
            name: approval.revokedByName ?? t("someone"),
            when: format.dateTime(new Date(approval.revokedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </section>
    );
  }
  if (!approval.canRevoke) return null;
  const usedAt = approval.grantConsumedAt ?? approval.releasedAt ?? null;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <Button
        variant="outline"
        size="lg"
        className="border-deny text-deny"
        onClick={() => setOpen(true)}
      >
        {t("revoke")}
      </Button>
      <RevokeDialog
        item={open ? { kind: "agent", id: approval.id, usedAt } : null}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}

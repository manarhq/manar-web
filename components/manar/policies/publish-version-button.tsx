"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UploadSimpleIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { usePublishPolicyVersion } from "@/hooks/use-policies";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * Gated client-side on the signed-in user's roles (SECURITY_ADMIN or
 * TENANT_OWNER — manar-api's own narrower `@RequireRole` on
 * `POST /policies/:id/versions/:versionId/publish`, Section 6). This is
 * a UX nicety, not the real enforcement — manar-api's RolesGuard is the
 * actual authority and rejects the call regardless of what this button
 * does, per this product's own rule against a control whose real
 * security lives only in the frontend.
 */
export function PublishVersionButton({
  policyId,
  versionId,
  version,
  canPublish,
}: {
  policyId: string;
  versionId: string;
  version: number;
  canPublish: boolean;
}) {
  const t = useTranslations("policies.detail");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const publish = usePublishPolicyVersion(policyId);

  if (!canPublish) {
    return <span className="text-xs text-muted-foreground">{t("publishRoleHint")}</span>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) publish.reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <UploadSimpleIcon />
        {t("publishButton")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("publishConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("publishConfirmDescription")}</DialogDescription>
        </DialogHeader>
        {publish.isError && (
          <p className="text-sm text-destructive">{apiErrorMessage(publish.error)}</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            disabled={publish.isPending}
            onClick={() =>
              publish.mutate(versionId, {
                onSuccess: () => {
                  toast.success(t("publishSuccess", { version }));
                  setOpen(false);
                },
                onError: () => toast.error(t("publishError")),
              })
            }
          >
            {publish.isPending ? tCommon("submitting") : t("publishButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

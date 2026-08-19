"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BanIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRevokeAgent } from "@/hooks/use-agents";
import { apiErrorMessage } from "@/lib/api/errors";

export function RevokeAgentDialog({ agentId, disabled }: { agentId: string; disabled?: boolean }) {
  const t = useTranslations("agents.revoke");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const revoke = useRevokeAgent(agentId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setReason("");
          revoke.reset();
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled} />}>
        <BanIcon />
        {t("button")}
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (reason.trim().length === 0 || revoke.isPending) return;
            revoke.mutate(reason.trim(), {
              onSuccess: () => {
                toast.success(t("success"));
                setOpen(false);
              },
              onError: () => toast.error(t("error")),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5 py-2">
            <Label htmlFor="revoke-reason">{t("reasonLabel")}</Label>
            <Input
              id="revoke-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("reasonPlaceholder")}
              maxLength={500}
              autoComplete="off"
            />
            {revoke.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(revoke.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={reason.trim().length === 0 || revoke.isPending}
            >
              {revoke.isPending ? tCommon("submitting") : t("confirmButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

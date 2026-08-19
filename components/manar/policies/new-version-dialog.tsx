"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GitBranchPlusIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePolicyVersion, type PolicyVersion } from "@/hooks/use-policies";
import { apiErrorMessage } from "@/lib/api/errors";

export function NewVersionDialog({
  policyId,
  versions,
}: {
  policyId: string;
  versions: PolicyVersion[];
}) {
  const t = useTranslations("policies.detail.newVersionDialog");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [contentYaml, setContentYaml] = useState("");
  const [rollbackToVersionId, setRollbackToVersionId] = useState<string>("");
  const [reason, setReason] = useState("");
  const createVersion = useCreatePolicyVersion(policyId);

  function reset() {
    setContentYaml("");
    setRollbackToVersionId("");
    setReason("");
    createVersion.reset();
  }

  const isRollback = rollbackToVersionId !== "";
  const canSubmit = (isRollback || contentYaml.trim().length > 0) && !createVersion.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <GitBranchPlusIcon />
        {t("title")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createVersion.mutate(
              isRollback
                ? { rollbackToVersionId, reason: reason.trim() || undefined }
                : { contentYaml, reason: reason.trim() || undefined },
              {
                onSuccess: (data) => {
                  toast.success(t("success", { version: data.version }));
                  setOpen(false);
                  reset();
                },
              },
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("rollbackLabel")}</Label>
              <Select
                value={rollbackToVersionId || "NONE"}
                onValueChange={(value) =>
                  setRollbackToVersionId(value === "NONE" ? "" : (value ?? ""))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{t("rollbackNone")}</SelectItem>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isRollback && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-version-content">{t("contentLabel")}</Label>
                <Textarea
                  id="new-version-content"
                  value={contentYaml}
                  onChange={(e) => setContentYaml(e.target.value)}
                  rows={10}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-version-reason">{t("reasonLabel")}</Label>
              <Input
                id="new-version-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                autoComplete="off"
              />
            </div>

            {createVersion.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(createVersion.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createVersion.isPending ? tCommon("submitting") : tCommon("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

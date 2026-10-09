"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "@phosphor-icons/react/ssr";
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
import { useCreatePolicy } from "@/hooks/use-policies";
import { apiErrorMessage } from "@/lib/api/errors";

const DEFAULT_YAML = `rules:
  - name: Default deny
    toolId: "*"
    actionId: "*"
    resourcePattern: "*"
    effect: DENY
`;

export function CreatePolicyDialog() {
  const t = useTranslations("policies.createDialog");
  const tPolicies = useTranslations("policies");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contentYaml, setContentYaml] = useState(DEFAULT_YAML);
  const [reason, setReason] = useState("");
  const createPolicy = useCreatePolicy();

  function reset() {
    setName("");
    setDescription("");
    setContentYaml(DEFAULT_YAML);
    setReason("");
    createPolicy.reset();
  }

  const canSubmit =
    name.trim().length > 0 && contentYaml.trim().length > 0 && !createPolicy.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        <span>{tPolicies("newPolicy")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createPolicy.mutate(
              {
                name: name.trim(),
                description: description.trim() || undefined,
                contentYaml,
                reason: reason.trim() || undefined,
              },
              {
                onSuccess: () => {
                  toast.success(t("success", { name: name.trim() }));
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

          <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-name">{t("nameLabel")}</Label>
              <Input
                id="policy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                maxLength={200}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-description">{t("descriptionLabel")}</Label>
              <Input
                id="policy-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-content">{t("contentLabel")}</Label>
              <Textarea
                id="policy-content"
                value={contentYaml}
                onChange={(e) => setContentYaml(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground">{t("contentHint")}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="policy-reason">{t("reasonLabel")}</Label>
              <Input
                id="policy-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                autoComplete="off"
              />
            </div>

            {createPolicy.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(createPolicy.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createPolicy.isPending ? tCommon("creating") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

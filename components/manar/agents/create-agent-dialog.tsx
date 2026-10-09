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
import { useCreateAgent } from "@/hooks/use-agents";
import { apiErrorMessage } from "@/lib/api/errors";

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/** The list page's "New agent" action — the only way this console can
 * put a real Agent row into `GET /agents` (POST /agents), since nothing
 * else in this phase creates one. */
export function CreateAgentDialog() {
  const t = useTranslations("agents.createDialog");
  const tAgents = useTranslations("agents");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const createAgent = useCreateAgent();

  const slugValid = SLUG_PATTERN.test(slug) && slug.length <= 63;
  const canSubmit = slugValid && displayName.trim().length > 0 && !createAgent.isPending;

  function reset() {
    setSlug("");
    setDisplayName("");
    createAgent.reset();
  }

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
        <span>{tAgents("newAgent")}</span>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createAgent.mutate(
              { slug, displayName: displayName.trim() },
              {
                onSuccess: (data) => {
                  toast.success(t("success", { name: data.displayName }));
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
              <Label htmlFor="agent-slug">{t("slugLabel")}</Label>
              <Input
                id="agent-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                placeholder={t("slugPlaceholder")}
                maxLength={63}
                aria-invalid={slug.length > 0 && !slugValid}
                autoComplete="off"
              />
              <span className="text-xs text-muted-foreground">{t("slugHint")}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="agent-display-name">{t("displayNameLabel")}</Label>
              <Input
                id="agent-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("displayNamePlaceholder")}
                maxLength={200}
                autoComplete="off"
              />
            </div>
            {createAgent.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(createAgent.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createAgent.isPending ? tCommon("creating") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

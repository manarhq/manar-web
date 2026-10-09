"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { CheckIcon, CopyIcon, KeyIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateEnrollmentToken } from "@/hooks/use-agents";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * Section 34's "displays the raw token once, never again" — the token
 * only ever exists in this component's own `useState`, populated
 * directly from the mutation's response. It is never written to
 * TanStack Query cache as query data, never round-tripped through a URL
 * or router state, and is discarded the moment this dialog closes
 * (`onOpenChange`) — there is no code path that can bring it back.
 */
export function EnrollmentTokenDialog({
  agentId,
  disabled,
}: {
  agentId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("agents.enrollment");
  const tCommon = useTranslations("common.actions");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const createToken = useCreateEnrollmentToken(agentId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          createToken.reset();
          setCopied(false);
        }
      }}
    >
      <Button
        size="sm"
        variant="outline"
        disabled={disabled}
        title={disabled ? t("generateDisabledHint") : undefined}
        onClick={() => {
          setOpen(true);
          createToken.mutate(undefined, {
            onError: () => toast.error(t("error")),
          });
        }}
      >
        <KeyIcon />
        {t("generateButton")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>

        {createToken.isPending && (
          <p className="text-sm text-muted-foreground">{tCommon("submitting")}</p>
        )}

        {createToken.isError && (
          <p className="text-sm text-destructive">{apiErrorMessage(createToken.error)}</p>
        )}

        {createToken.isSuccess && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2 rounded-lg border border-risk-high/30 bg-risk-high/10 p-3 text-sm text-risk-high">
              <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{t("warning")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("tokenLabel")}</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
                  {createToken.data.token}
                </code>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label={t("copyToken")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(createToken.data.token);
                    setCopied(true);
                    toast.success(tCommon("copied"));
                  }}
                >
                  {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("expiresAt")}:{" "}
              {format.dateTime(new Date(createToken.data.expiresAt), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

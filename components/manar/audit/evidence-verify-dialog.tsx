"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { FileCheck2Icon } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { useEvidenceVerify } from "@/hooks/use-audit";
import { apiErrorMessage } from "@/lib/api/errors";

/** Pulls `{ bundle, signature }` out of a file saved by the export dialog
 * (the full `POST /evidence/export` response). */
export function parseEvidenceFile(text: string): { bundle: unknown; signature: string } | null {
  try {
    const parsed = JSON.parse(text) as { bundle?: unknown; signature?: { signature?: unknown } };
    const signature = parsed.signature?.signature;
    if (parsed.bundle === undefined || typeof signature !== "string" || !signature) return null;
    return { bundle: parsed.bundle, signature };
  } catch {
    return null;
  }
}

/** Upload an exported bundle and have manar-api verify it (`POST /evidence/verify`). */
export function EvidenceVerifyDialog() {
  const t = useTranslations("audit.verifyBundle");
  const tCommon = useTranslations("common.actions");
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [fileError, setFileError] = useState(false);
  const verify = useEvidenceVerify();

  async function onFile(file: File | undefined) {
    verify.reset();
    setFileError(false);
    if (!file) return;
    const input = parseEvidenceFile(await file.text());
    if (!input) {
      setFileError(true);
      return;
    }
    verify.mutate(input);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          verify.reset();
          setFileError(false);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <FileCheck2Icon />
        {t("button")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2 text-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>{t("fileLabel")}</Label>
            <input
              id={inputId}
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="text-xs file:me-3 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-foreground"
            />
          </div>

          <div role="status" aria-live="polite" className="flex flex-col gap-1">
            {verify.isPending && <span className="text-muted-foreground">{t("verifying")}</span>}
            {fileError && <span className="text-destructive">{t("notABundle")}</span>}
            {verify.isError && (
              <span className="text-destructive">
                {t("error")} {apiErrorMessage(verify.error)}
              </span>
            )}
            {verify.data?.valid === true && (
              <span className="font-medium text-state-safe">{t("valid")}</span>
            )}
            {verify.data?.valid === false && (
              <span className="font-medium text-risk-critical">
                {t("invalid")}{" "}
                <span dir="ltr" className="font-data">
                  {verify.data.reason}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("scopeNote")}</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

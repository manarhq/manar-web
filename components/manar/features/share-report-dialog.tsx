"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRevokeShare, useShareReport } from "@/hooks/use-features";

/** Creates the share link when opened, shows it with copy, and can revoke it. The link shows
 * totals only (the API snapshots them at share time). */
export function ShareReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("features.share");
  const locale = useLocale();
  const share = useShareReport();
  const revoke = useRevokeShare();
  const [shareId, setShareId] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!open) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;
    share.mutate(undefined, { onSuccess: (r) => setShareId(r.shareId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const url = shareId ? `${window.location.origin}/${locale}/report/${shareId}` : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setShareId(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {share.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t("failed")}
          </p>
        ) : shareId ? (
          <div className="grid gap-2">
            <Label htmlFor="report-link">{t("link")}</Label>
            <Input
              id="report-link"
              readOnly
              value={url}
              dir="ltr"
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground" aria-busy>
            {t("creating")}
          </p>
        )}
        <DialogFooter>
          {shareId && (
            <>
              <Button
                variant="outline"
                disabled={revoke.isPending}
                onClick={() =>
                  revoke.mutate(shareId, {
                    onSuccess: () => {
                      toast.success(t("revoked"));
                      setShareId(null);
                      onOpenChange(false);
                    },
                    onError: () => toast.error(t("revokeFailed")),
                  })
                }
              >
                {t("revoke")}
              </Button>
              <Button
                onClick={() =>
                  void navigator.clipboard.writeText(url).then(() => toast.success(t("copied")))
                }
              >
                {t("copy")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

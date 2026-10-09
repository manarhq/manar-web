"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CloudArrowDownIcon } from "@phosphor-icons/react/ssr";
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
import { useEvidenceExport } from "@/hooks/use-audit";
import { apiErrorMessage } from "@/lib/api/errors";

/** Wired to the real `POST /evidence/export` (Phase 9b). Every field is
 * optional individually, but manar-api requires at least one. */
export function EvidenceExportDialog() {
  const t = useTranslations("audit.export");
  const tCommon = useTranslations("common.actions");
  const [open, setOpen] = useState(false);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [agentId, setAgentId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const exportEvidence = useEvidenceExport();

  function reset() {
    setSince("");
    setUntil("");
    setAgentId("");
    setTaskId("");
    setCorrelationId("");
    exportEvidence.reset();
  }

  const hasAnyFilter = Boolean(since || until || agentId || taskId || correlationId);

  function downloadBundle() {
    if (!exportEvidence.data) return;
    const blob = new Blob([JSON.stringify(exportEvidence.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manar-evidence-${exportEvidence.data.exportId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CloudArrowDownIcon />
        {t("button")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {!exportEvidence.data ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="evidence-since">{t("sinceLabel")}</Label>
                <Input
                  id="evidence-since"
                  type="datetime-local"
                  value={since}
                  onChange={(e) => setSince(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="evidence-until">{t("untilLabel")}</Label>
                <Input
                  id="evidence-until"
                  type="datetime-local"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="evidence-agent">{t("agentIdLabel")}</Label>
              <Input
                id="evidence-agent"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="evidence-task">{t("taskIdLabel")}</Label>
              <Input
                id="evidence-task"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="evidence-correlation">{t("correlationIdLabel")}</Label>
              <Input
                id="evidence-correlation"
                value={correlationId}
                onChange={(e) => setCorrelationId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            {exportEvidence.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(exportEvidence.error)}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-2 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t("exportIdLabel")}</span>
              <span className="font-mono text-xs">{exportEvidence.data.exportId}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t("eventCountLabel")}</span>
              <span>{exportEvidence.data.bundle.events.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t("signatureLabel")}</span>
              {/* Forced LTR regardless of page locale: this is a raw JSON
               * dump (the signed evidence export's signature -- design-
               * rework.md frames this as "legal artifacts, not
               * dashboards"), not prose. Under dir="rtl" the browser's bidi
               * algorithm reorders this block's content, which is wrong
               * for structured/numeric data -- same fix as audit-detail-
               * view.tsx's raw evidence block and policy-detail-view.tsx's
               * JSON/YAML dump. */}
              <code
                dir="ltr"
                className="overflow-x-auto rounded-md bg-muted px-2 py-1 font-mono text-xs break-all"
              >
                {JSON.stringify(exportEvidence.data.signature)}
              </code>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadBundle}>
              <CloudArrowDownIcon className="size-3.5" />
              {t("downloadBundle")}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {tCommon("close")}
          </Button>
          {!exportEvidence.data && (
            <Button
              type="button"
              disabled={!hasAnyFilter || exportEvidence.isPending}
              onClick={() =>
                exportEvidence.mutate(
                  {
                    since: since ? new Date(since).toISOString() : undefined,
                    until: until ? new Date(until).toISOString() : undefined,
                    agentId: agentId || undefined,
                    taskId: taskId || undefined,
                    correlationId: correlationId || undefined,
                  },
                  {
                    onSuccess: () => toast.success(t("success")),
                    onError: () => toast.error(t("error")),
                  },
                )
              }
            >
              {exportEvidence.isPending ? tCommon("submitting") : t("submit")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

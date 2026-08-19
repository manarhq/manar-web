"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
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
import { useCreateIncident, type IncidentSeverity } from "@/hooks/use-incidents";
import { apiErrorMessage } from "@/lib/api/errors";

const SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Splits on commas and/or whitespace, drops empties — a plain,
 * human-curated reference list into `AuditEvent.correlationId`
 * (Section 70's `Incident.relatedCorrelationIds`), never validated
 * against real rows by manar-api itself. */
function parseCorrelationIds(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function CreateIncidentDialog() {
  const t = useTranslations("incidents.createDialog");
  const tIncidents = useTranslations("incidents");
  const tCommon = useTranslations("common.actions");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [correlationIds, setCorrelationIds] = useState("");
  const createIncident = useCreateIncident();

  function reset() {
    setTitle("");
    setDescription("");
    setSeverity("MEDIUM");
    setCorrelationIds("");
    createIncident.reset();
  }

  const canSubmit =
    title.trim().length > 0 && description.trim().length > 0 && !createIncident.isPending;

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
        <span>{tIncidents("newIncident")}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            createIncident.mutate(
              {
                title: title.trim(),
                description: description.trim(),
                severity,
                relatedCorrelationIds: parseCorrelationIds(correlationIds),
              },
              {
                onSuccess: (incident) => {
                  toast.success(t("success", { title: title.trim() }));
                  setOpen(false);
                  reset();
                  router.push(`/incidents/${incident.id}`);
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
              <Label htmlFor="incident-title">{t("titleLabel")}</Label>
              <Input
                id="incident-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                maxLength={200}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-description">{t("descriptionLabel")}</Label>
              <Textarea
                id="incident-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-severity">{t("severityLabel")}</Label>
              <Select
                value={severity}
                onValueChange={(value) => setSeverity(value as IncidentSeverity)}
              >
                <SelectTrigger id="incident-severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tIncidents(`severity.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="incident-correlation-ids">{t("correlationIdsLabel")}</Label>
              <Textarea
                id="incident-correlation-ids"
                value={correlationIds}
                onChange={(e) => setCorrelationIds(e.target.value)}
                rows={2}
                placeholder={t("correlationIdsPlaceholder")}
                className="font-mono text-xs"
              />
              <span className="text-xs text-muted-foreground">{t("correlationIdsHint")}</span>
            </div>

            {createIncident.isError && (
              <p className="text-sm text-destructive">{apiErrorMessage(createIncident.error)}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {createIncident.isPending ? tCommon("creating") : tCommon("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/use-tenant-settings";
import { apiErrorMessage } from "@/lib/api/errors";

const RESIDENCY_VALUES = ["UAE", "CUSTOM_REGION", "AIR_GAPPED"] as const;
type ResidencyValue = (typeof RESIDENCY_VALUES)[number];

/**
 * `/settings/residency` (Phase 14 design spec: "likely the most
 * consequential form here — it gates whether AI calls can reach an
 * external provider"). A single control (the `residency` enum), but a
 * genuinely careful one: changing it requires an explicit confirmation
 * dialog that restates what the target value means, and the page
 * explains every value's real-world implication rather than just listing
 * enum labels.
 */
export function ResidencySettingsView() {
  const t = useTranslations("settings.residency");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common.actions");
  const query = useTenantSettings();
  const update = useUpdateTenantSettings();
  const [pendingValue, setPendingValue] = useState<ResidencyValue | null>(null);

  function confirmChange() {
    if (!pendingValue) return;
    update.mutate(
      { residency: pendingValue },
      {
        onSuccess: () => {
          toast.success(tSettings("saveSuccess"));
          setPendingValue(null);
        },
        onError: (error) => toast.error(apiErrorMessage(error, tSettings("saveError"))),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex items-start gap-2 rounded-lg border border-risk-moderate/30 bg-risk-moderate/10 p-3 text-sm text-risk-moderate">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{t("warning")}</span>
      </div>

      {query.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{tSettings("loadError")}</span>
          <span className="text-xs">{apiErrorMessage(query.error)}</span>
          <Button size="xs" variant="outline" onClick={() => query.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 pt-4">
              <Label htmlFor="residency-select">{t("currentLabel")}</Label>
              <Select
                value={query.data.residency}
                onValueChange={(value) => setPendingValue(value as ResidencyValue)}
                disabled={update.isPending}
              >
                <SelectTrigger id="residency-select" className="w-64">
                  {/* Base UI's SelectValue shows the raw selected value
                   * ("CUSTOM_REGION", "AIR_GAPPED", ...) unless given a
                   * render function — mapped back to its label here so
                   * the trigger doesn't regress to raw-enum text. */}
                  <SelectValue>
                    {(value: ResidencyValue | null) => (value ? t(`options.${value}.label`) : null)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RESIDENCY_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`options.${value}.label`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {RESIDENCY_VALUES.map((value) => (
              <Card
                key={value}
                className={value === query.data.residency ? "ring-2 ring-primary/50" : undefined}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{t(`options.${value}.label`)}</CardTitle>
                  <CardDescription>{t(`options.${value}.description`)}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={pendingValue !== null} onOpenChange={(open) => !open && setPendingValue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {pendingValue && t("confirmDescription", { to: t(`options.${pendingValue}.label`) })}
            </DialogDescription>
          </DialogHeader>
          {update.isError && (
            <p className="text-sm text-destructive">{apiErrorMessage(update.error)}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingValue(null)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" disabled={update.isPending} onClick={confirmChange}>
              {update.isPending ? tCommon("saving") : t("saveButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

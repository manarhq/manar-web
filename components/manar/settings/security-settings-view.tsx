"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/use-tenant-settings";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * `/settings/security` (Phase 14): rate limits (read-only, deployment-
 * wide) plus the two general security/data-handling toggles
 * `TenantSettingsResponseDto` exposes that aren't specifically about data
 * residency (`/settings/residency`) or AI-provider reachability
 * (`/settings/ai`) — `allowOutboundTelemetry` and `allowCloudStorage`.
 * Each switch is directly controlled by the live query result and PATCHes
 * on change (no separate local form state to go stale or need a "Save"
 * button for) — see `useUpdateTenantSettings`'s doc comment.
 */
export function SecuritySettingsView() {
  const t = useTranslations("settings.security");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common.actions");
  const query = useTenantSettings();
  const update = useUpdateTenantSettings();

  function handleToggle(field: "allowOutboundTelemetry" | "allowCloudStorage", value: boolean) {
    update.mutate(
      { [field]: value },
      {
        onSuccess: () => toast.success(tSettings("saveSuccess")),
        onError: (error) => toast.error(apiErrorMessage(error, tSettings("saveError"))),
      },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      {query.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <span>{tSettings("loadError")}</span>
          <span className="text-xs">{apiErrorMessage(query.error)}</span>
          <Button size="xs" variant="outline" onClick={() => query.refetch()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("rateLimitTitle")}</CardTitle>
              <CardDescription>{t("rateLimitDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="font-mono text-sm tabular-nums">
                {t("rateLimitValue", {
                  limit: query.data.rateLimit.humanRequestLimit,
                  windowSeconds: Math.round(query.data.rateLimit.humanWindowMs / 1000),
                })}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-4">
              <Label htmlFor="allow-outbound-telemetry" className="flex flex-col items-start gap-1">
                <span className="text-sm font-medium">{t("outboundTelemetryLabel")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t("outboundTelemetryDescription")}
                </span>
              </Label>
              <Switch
                id="allow-outbound-telemetry"
                checked={query.data.allowOutboundTelemetry}
                disabled={update.isPending}
                onCheckedChange={(checked) => handleToggle("allowOutboundTelemetry", checked)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-4">
              <Label htmlFor="allow-cloud-storage" className="flex flex-col items-start gap-1">
                <span className="text-sm font-medium">{t("cloudStorageLabel")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t("cloudStorageDescription")}
                </span>
              </Label>
              <Switch
                id="allow-cloud-storage"
                checked={query.data.allowCloudStorage}
                disabled={update.isPending}
                onCheckedChange={(checked) => handleToggle("allowCloudStorage", checked)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTenantSettings, useUpdateTenantSettings } from "@/hooks/use-tenant-settings";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * `/settings/ai` (Phase 14): read-only display of the deployment-wide AI
 * provider (`aiProvider`, `manar-api`-side `AI_ADVISORY_PROVIDER` config —
 * `manar-ai` exposes no way for `manar-api` to ask it this directly), plus
 * the one writable, tenant-scoped flag that actually governs whether this
 * tenant's requests may reach it externally (`allowExternalAi`). Takes
 * effect immediately server-side (no caching) — see
 * `TenantSettingsResponseDto.allowExternalAi`'s doc comment.
 */
export function AiSettingsView() {
  const t = useTranslations("settings.ai");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common.actions");
  const query = useTenantSettings();
  const update = useUpdateTenantSettings();

  function handleToggle(value: boolean) {
    update.mutate(
      { allowExternalAi: value },
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
        <Skeleton className="h-48 w-full" />
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
              <CardTitle>{t("providerLabel")}</CardTitle>
              <CardDescription>{t("providerScopeNote")}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <span className="font-mono text-sm">{query.data.aiProvider.provider}</span>
              <Badge variant={query.data.aiProvider.isExternal ? "destructive" : "secondary"}>
                {query.data.aiProvider.isExternal ? t("externalBadge") : t("internalBadge")}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-4">
              <Label htmlFor="allow-external-ai" className="flex flex-col items-start gap-1">
                <span className="text-sm font-medium">{t("allowExternalAiLabel")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {t("allowExternalAiDescription")}
                </span>
                {!query.data.aiProvider.isExternal && (
                  <span className="text-xs font-normal text-muted-foreground italic">
                    {t("allowExternalAiNoEffectNote", { provider: query.data.aiProvider.provider })}
                  </span>
                )}
              </Label>
              <Switch
                id="allow-external-ai"
                checked={query.data.allowExternalAi}
                disabled={update.isPending}
                onCheckedChange={handleToggle}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

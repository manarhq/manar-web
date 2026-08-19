"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/manar/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantSettings } from "@/hooks/use-tenant-settings";
import { apiErrorMessage } from "@/lib/api/errors";

function keycloakAdminConsoleUrl(issuerUrl: string, realm: string): string | null {
  try {
    const origin = new URL(issuerUrl).origin;
    return `${origin}/admin/master/console/#/${encodeURIComponent(realm)}`;
  } catch {
    return null;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-sm text-foreground" title={value}>
        {value}
      </span>
    </div>
  );
}

/**
 * `/settings/sso` (Phase 14 design spec: "read-only display + link out to
 * Keycloak's own admin console (not a duplicate SSO config UI)"). Every
 * field here comes straight from `TenantSettingsResponseDto.sso` —
 * nothing writable, no form. The admin-console URL is derived client-side
 * from `issuerUrl`/`realm` (manar-api doesn't return one directly) using
 * Keycloak's standard `/admin/master/console/#/<realm>` path.
 */
export function SsoSettingsView() {
  const t = useTranslations("settings.sso");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common.actions");
  const query = useTenantSettings();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

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
      ) : !query.data.sso ? (
        <p className="text-sm text-muted-foreground">{t("notProvisioned")}</p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border">
            <InfoRow label={t("realmLabel")} value={query.data.sso.realm} />
            <InfoRow label={t("issuerLabel")} value={query.data.sso.issuerUrl} />
            <InfoRow label={t("clientIdLabel")} value={query.data.sso.clientId} />
            <InfoRow
              label={t("authorizationEndpointLabel")}
              value={query.data.sso.authorizationEndpoint}
            />
            <InfoRow label={t("tokenEndpointLabel")} value={query.data.sso.tokenEndpoint} />
            <InfoRow
              label={t("endSessionEndpointLabel")}
              value={query.data.sso.endSessionEndpoint}
            />
            <InfoRow label={t("jwksUriLabel")} value={query.data.sso.jwksUri} />
            <div className="flex flex-col gap-2 pt-4">
              {(() => {
                const url = keycloakAdminConsoleUrl(query.data.sso.issuerUrl, query.data.sso.realm);
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-start"
                    disabled={!url}
                    render={
                      url ? <a href={url} target="_blank" rel="noreferrer noopener" /> : undefined
                    }
                  >
                    <ExternalLinkIcon />
                    {t("openConsoleButton")}
                  </Button>
                );
              })()}
              <span className="text-xs text-muted-foreground">{t("openConsoleHint")}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

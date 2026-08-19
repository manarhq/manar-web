"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/manar/page-header";
import { NotFoundPanel } from "@/components/manar/not-found-panel";
import { PolicyVersionStatusBadge } from "@/components/manar/policies/policy-status-badge";
import { PublishVersionButton } from "@/components/manar/policies/publish-version-button";
import { NewVersionDialog } from "@/components/manar/policies/new-version-dialog";
import { PolicyVersionDiff } from "@/components/manar/policies/policy-version-diff";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePolicyDetail,
  usePolicyVersions,
  usePolicyVersionYaml,
  type PolicyVersion,
} from "@/hooks/use-policies";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function VersionContentViewer({ policyId, version }: { policyId: string; version: PolicyVersion }) {
  const t = useTranslations("policies.detail");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const yaml = usePolicyVersionYaml(policyId, format === "yaml" ? version.id : null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant={format === "json" ? "secondary" : "ghost"}
          onClick={() => setFormat("json")}
        >
          {t("viewJson")}
        </Button>
        <Button
          size="xs"
          variant={format === "yaml" ? "secondary" : "ghost"}
          onClick={() => setFormat("yaml")}
        >
          {t("viewYaml")}
        </Button>
      </div>
      <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs">
        {format === "json"
          ? JSON.stringify(version.content, null, 2)
          : (yaml.data ?? (yaml.isPending ? "…" : ""))}
      </pre>
    </div>
  );
}

export function PolicyDetailView({ policyId, roles }: { policyId: string; roles: string[] }) {
  const t = useTranslations("policies.detail");
  const tPolicies = useTranslations("policies");
  const format = useFormatter();
  const { data: policy, isPending, isError } = usePolicyDetail(policyId);
  const versionsQuery = usePolicyVersions(policyId);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");

  const canPublish = roles.includes("SECURITY_ADMIN") || roles.includes("TENANT_OWNER");

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !policy) {
    return <NotFoundPanel title={tPolicies("title")} body={t("notFoundBody")} />;
  }

  const versions = versionsQuery.data ?? [];
  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? policy.currentVersion ?? versions[0];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={policy.name}
        description={policy.description ?? undefined}
        actions={<NewVersionDialog policyId={policy.id} versions={versions} />}
      />

      <Link href="/policies" className="text-xs text-muted-foreground hover:text-foreground">
        ← {t("backToList")}
      </Link>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("overviewTitle")}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t("name")} value={policy.name} />
          <Field
            label={t("createdAt")}
            value={format.dateTime(new Date(policy.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <Field
            label={t("currentVersionTitle")}
            value={
              policy.currentVersion ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono">v{policy.currentVersion.version}</span>
                  <PolicyVersionStatusBadge status={policy.currentVersion.status} />
                </span>
              ) : (
                t("currentVersionNone")
              )
            }
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t("versionsTitle")}</h2>
          <span className="text-xs text-muted-foreground">{t("versionsImmutableNote")}</span>
        </div>

        {versionsQuery.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("currentVersionNone")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("versionColumns.version")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("versionColumns.status")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("versionColumns.publishedAt")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("versionColumns.createdAt")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("versionColumns.reason")}
                  </th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {versions
                  .slice()
                  .sort((a, b) => b.version - a.version)
                  .map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0">
                      <td className="px-2 py-1.5 font-mono text-xs">v{v.version}</td>
                      <td className="px-2 py-1.5">
                        <PolicyVersionStatusBadge status={v.status} />
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {v.publishedAt
                          ? format.dateTime(new Date(v.publishedAt), { dateStyle: "medium" })
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {format.dateTime(new Date(v.createdAt), { dateStyle: "medium" })}
                      </td>
                      <td className="px-2 py-1.5 text-xs text-muted-foreground">
                        {v.reason ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        {v.status === "DRAFT" ? (
                          <PublishVersionButton
                            policyId={policy.id}
                            versionId={v.id}
                            version={v.version}
                            canPublish={canPublish}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("alreadyPublished")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedVersion && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t("viewTitle")}</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t("selectVersionLabel")}</span>
              <Select
                value={selectedVersion.id}
                onValueChange={(value) => setSelectedVersionId(value ?? "")}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <VersionContentViewer policyId={policy.id} version={selectedVersion} />
        </section>
      )}

      {versions.length >= 2 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("diffTitle")}</h2>
          <PolicyVersionDiff versions={versions.slice().sort((a, b) => b.version - a.version)} />
        </section>
      )}
    </div>
  );
}

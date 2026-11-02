"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/manar/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isRoleManager } from "@/lib/roles";
import { ChangesTab } from "./changes-tab";
import { HostsTab } from "./hosts-tab";
import { InstallKeysTab } from "./install-keys-tab";
import { OrganisationTab } from "./organisation-tab";
import { RulesTab } from "./rules-tab";

/**
 * Hosts console. Write controls are shown to Tenant Owners and Security Admins only; Auditors read.
 * That is a UX nicety: manar-api's RolesGuard is the real gate on every request.
 */
export function HostsView({ roles, title }: { roles: readonly string[]; title?: string }) {
  const t = useTranslations("hosts");
  const canWrite = isRoleManager(roles);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title ?? t("title")} description={t("description")} />
      {!canWrite && <p className="text-sm text-muted-foreground">{t("readOnlyNote")}</p>}
      <Tabs defaultValue="hosts">
        <TabsList>
          <TabsTrigger value="hosts">{t("tabs.hosts")}</TabsTrigger>
          <TabsTrigger value="keys">{t("tabs.installKeys")}</TabsTrigger>
          <TabsTrigger value="organisation">{t("tabs.organisation")}</TabsTrigger>
          <TabsTrigger value="rules">{t("tabs.rules")}</TabsTrigger>
          <TabsTrigger value="changes">{t("tabs.changes")}</TabsTrigger>
        </TabsList>
        <TabsContent value="hosts" className="pt-3">
          <HostsTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="keys" className="pt-3">
          <InstallKeysTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="organisation" className="pt-3">
          <OrganisationTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="changes" className="pt-3">
          <ChangesTab canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="rules" className="pt-3">
          <RulesTab canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

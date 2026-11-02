"use client";

import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { PageHeader } from "@/components/manar/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useDataPreferences,
  useSetDataPreferences,
  useSetWorkspaceDataPreferences,
  useWorkspaceDataPreferences,
  type DataFlags,
} from "@/hooks/use-data-preferences";

export const PRIVACY_POLICY_URL = (locale: string) => `https://manar.vax.sh/${locale}/privacy`;

function SwitchRow(props: {
  id: string;
  label: string;
  description: string;
  note?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={props.id} className="flex flex-col items-start gap-1">
        <span className="text-sm font-medium">{props.label}</span>
        <span className="text-xs font-normal text-muted-foreground">{props.description}</span>
        {props.note && (
          <span className="text-xs font-normal text-muted-foreground italic">{props.note}</span>
        )}
      </Label>
      <Switch
        id={props.id}
        checked={props.checked}
        disabled={props.disabled}
        onCheckedChange={props.onChange}
      />
    </div>
  );
}

/** `/settings/privacy`: the user's two switches, and the workspace's for managers on Company. */
export function PrivacySettingsView({ showWorkspace }: { showWorkspace: boolean }) {
  const t = useTranslations("privacy");
  const locale = useLocale();
  const query = useDataPreferences();
  const set = useSetDataPreferences();
  const save = (body: Partial<DataFlags>) =>
    set.mutate(body, { onError: () => toast.error(t("saveError")) });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />
      {query.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("loadError")}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("user.title")}</CardTitle>
            <CardDescription>{t("user.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {(() => {
              const d = query.data;
              const improveLocked = d.org?.improveManar === false;
              const trainingLocked = improveLocked || d.org?.aiTraining === false;
              const improveOn = improveLocked ? false : d.improveManar;
              const trainingNeedsImprove = !improveOn && !trainingLocked;
              return (
                <>
                  <SwitchRow
                    id="help-improve"
                    label={t("improve.label")}
                    description={t("improve.description")}
                    note={improveLocked ? t("lockedByOrg") : undefined}
                    checked={improveOn}
                    disabled={improveLocked || set.isPending}
                    onChange={(v) => save({ improveManar: v })}
                  />
                  <SwitchRow
                    id="ai-training"
                    label={t("training.label")}
                    description={t("training.description")}
                    note={
                      trainingLocked
                        ? t("lockedByOrg")
                        : trainingNeedsImprove
                          ? t("training.needsImprove")
                          : undefined
                    }
                    checked={trainingLocked || trainingNeedsImprove ? false : d.aiTraining}
                    disabled={trainingLocked || trainingNeedsImprove || set.isPending}
                    onChange={(v) => save({ aiTraining: v })}
                  />
                </>
              );
            })()}
            <p className="text-xs text-muted-foreground">
              {t("policyIntro")}{" "}
              <a
                href={PRIVACY_POLICY_URL(locale)}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("policyLink")}
              </a>
            </p>
          </CardContent>
        </Card>
      )}
      {showWorkspace && <WorkspaceSwitches />}
    </div>
  );
}

function WorkspaceSwitches() {
  const t = useTranslations("privacy");
  const query = useWorkspaceDataPreferences();
  const set = useSetWorkspaceDataPreferences();
  // 403 (not a manager, or not a Company plan) or any error: show nothing, the API is the authority.
  if (!query.data) return null;
  const d = query.data;
  const save = (body: Partial<DataFlags>) =>
    set.mutate({ ...d, ...body }, { onError: () => toast.error(t("saveError")) });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workspace.title")}</CardTitle>
        <CardDescription>{t("workspace.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <SwitchRow
          id="org-help-improve"
          label={t("workspace.improve.label")}
          description={t("workspace.improve.description")}
          checked={d.improveManar}
          disabled={set.isPending}
          onChange={(v) => save({ improveManar: v })}
        />
        <SwitchRow
          id="org-ai-training"
          label={t("workspace.training.label")}
          description={t("workspace.training.description")}
          note={d.improveManar ? undefined : t("training.needsImprove")}
          checked={d.improveManar && d.aiTraining}
          disabled={!d.improveManar || set.isPending}
          onChange={(v) => save({ aiTraining: v })}
        />
      </CardContent>
    </Card>
  );
}

"use client";

import { useTranslations } from "next-intl";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";

/** The 403 body manar-api sends when a plan cap is hit (`PlanLimitError`), or when a lapsed
 * workspace is read-only (`workspace_read_only`). */
export interface PlanLimitPayload {
  code?: string;
  limit?: "devices" | "agents" | "cloudAgents";
  current?: number;
  max?: number;
  upgradeUrl?: string;
}

/** True when an API error is a plan-limit or read-only refusal, so a form can show this notice. */
export function isPlanLimitPayload(error: unknown): error is PlanLimitPayload {
  const code = (error as PlanLimitPayload | null)?.code;
  return code === "plan_limit_reached" || code === "workspace_read_only";
}

/** Shared by every track: renders the plan-limit 403 with an Upgrade link. */
export function PlanLimitNotice({ error }: { error: PlanLimitPayload }) {
  const t = useTranslations("planLimit");
  const readOnly = error.code === "workspace_read_only";
  return (
    <Alert role="alert">
      <AlertTitle>{readOnly ? t("readOnly") : t("title")}</AlertTitle>
      {!readOnly && error.limit && (
        <AlertDescription>
          {t("body", {
            max: error.max ?? 0,
            current: error.current ?? 0,
            limit: t(`limit.${error.limit}`),
          })}
        </AlertDescription>
      )}
      <a
        href={error.upgradeUrl ?? "/settings/billing"}
        className={buttonVariants({ size: "sm", className: "mt-2" })}
      >
        {t("upgrade")}
      </a>
    </Alert>
  );
}

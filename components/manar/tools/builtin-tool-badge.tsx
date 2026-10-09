"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

/** manar-api's own connector (the watcher's tools), recognised by its endpoint, never by its name. */
export function isBuiltinTool(tool: { baseEndpoint: string }): boolean {
  return tool.baseEndpoint.startsWith("manar://builtin");
}

export function BuiltinToolBadge({ tool }: { tool: { baseEndpoint: string } }) {
  const t = useTranslations("tools.builtin");
  if (!isBuiltinTool(tool)) return null;
  return (
    <Badge variant="neutral" title={t("hint")}>
      {t("label")}
    </Badge>
  );
}

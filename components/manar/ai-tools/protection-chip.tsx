"use client";

import { useTranslations } from "next-intl";

import { CoverageBadge } from "@/components/manar/ai-systems/coverage-badge";
import { coverageOf, modeKey, type AiToolRow } from "@/lib/personal/ai-tools";

/** Protection mode in words, and the enforcement label the API says the tool has earned. */
export function ProtectionChip({ tool }: { tool: AiToolRow }) {
  const t = useTranslations("personal.aiTools");
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      <span className="text-xs text-muted-foreground">{t(`mode.${modeKey(tool)}`)}</span>
      <CoverageBadge coverage={coverageOf(tool.enforcement)} />
    </span>
  );
}

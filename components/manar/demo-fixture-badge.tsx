"use client";

import { useTranslations } from "next-intl";

import { StatusBadge } from "@/components/manar/status-badge";

interface ToolLike {
  description?: string | null;
  metadata?: unknown;
}

/**
 * True when a tool is served by a local stand-in, not a live system:
 * `metadata.dataOrigin === "DEMO_FIXTURE"` when the API exposes metadata,
 * otherwise the seeded "DEMO FIXTURE" marker in the description (the tool
 * list DTO does not carry metadata yet).
 */
export function isDemoFixture(tool: ToolLike): boolean {
  const metadata = tool.metadata as { dataOrigin?: unknown } | null | undefined;
  if (metadata?.dataOrigin === "DEMO_FIXTURE") return true;
  return typeof tool.description === "string" && /demo[ _]fixture/i.test(tool.description);
}

/** Never present fixture data as live. */
export function DemoFixtureBadge({ tool }: { tool: ToolLike }) {
  const t = useTranslations("tools.demoFixture");
  if (!isDemoFixture(tool)) return null;
  return (
    <StatusBadge tone="warning" className="shrink-0">
      <span title={t("hint")}>{t("label")}</span>
      <span className="sr-only">: {t("hint")}</span>
    </StatusBadge>
  );
}

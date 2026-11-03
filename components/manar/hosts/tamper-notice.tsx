"use client";

import { useFormatter, useTranslations } from "next-intl";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { StatusBadge } from "@/components/manar/status-badge";
import { tamperKey, type DeviceTamper } from "@/lib/hosts/tamper";

/**
 * "Tampered": the device reported, in the last 7 days, that something took Manar's check out of
 * play (manar-api src/hosts/tamper.ts). Says what, when and where, in plain words; the masked path
 * is shown as the device sent it.
 */
export function TamperNotice({ tamper }: { tamper: DeviceTamper }) {
  const t = useTranslations("hosts.tamper");
  const format = useFormatter();
  return (
    <div className="flex flex-col gap-0.5 text-xs" role="status">
      <StatusBadge tone="negative" className="self-start">
        <WarningIcon aria-hidden />
        {t("badge")}
      </StatusBadge>
      <span>{t(`kind.${tamperKey(tamper.kind)}`)}</span>
      {tamper.maskedPath && (
        <span className="break-all font-mono text-muted-foreground" dir="ltr">
          {tamper.maskedPath}
        </span>
      )}
      <span className="text-muted-foreground">
        {t("seen", { when: format.relativeTime(new Date(tamper.at)) })}
      </span>
    </div>
  );
}

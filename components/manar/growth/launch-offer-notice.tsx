"use client";

import { GiftIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";

import { useLaunchOffer } from "@/hooks/use-growth";

/** "37 of 100 left": the launch offer counter. Renders nothing while loading, when the offer is off
 * (no Stripe on this deployment) or when it never applied; says so plainly once it has ended. */
export function LaunchOfferNotice() {
  const t = useTranslations("growth.offer");
  const { data } = useLaunchOffer();
  if (!data || (!data.enabled && data.claimed === 0)) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-brand bg-brand-soft p-3 text-sm"
    >
      <GiftIcon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0">
        {data.enabled ? (
          <>
            <p className="font-medium text-foreground">{t("title")}</p>
            <p className="text-muted-foreground">{t("body")}</p>
            <p className="mt-1 font-medium tabular-nums text-foreground">
              {t("left", { remaining: data.remaining, total: data.total })}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">{t("ended")}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { sampleSnapshot, subscribeSample } from "@/lib/personal/sample-mode";

/** Persistent while the sample workspace is open: "Sample data · Add your own device". */
export function SampleBanner() {
  const t = useTranslations("features.sample");
  const sample = useSyncExternalStore(subscribeSample, sampleSnapshot, () => null);
  if (!sample) return null;
  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-2 rounded-lg border border-brand bg-brand/10 px-3 py-2 text-sm"
    >
      <strong className="font-medium">{t("bannerLabel")}</strong>
      <span aria-hidden>·</span>
      <Link href="/add-device" className="text-brand-text underline underline-offset-2">
        {t("bannerCta")}
      </Link>
    </div>
  );
}

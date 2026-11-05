"use client";

import { useFormatter, useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useFriction } from "@/hooks/use-friction";

/**
 * "How much Manar asked you": a small card on Home. Today's prompts, the 7-day average against the
 * 5-a-day budget, and a link to the trend. Quiet by design: it says nothing when it cannot read
 * the numbers, and nothing when Manar has not asked at all.
 */
export function FrictionCard() {
  const t = useTranslations("features.friction");
  const format = useFormatter();
  const q = useFriction(7);
  const r = q.data;
  if (!r || r.totals.prompts === 0) return null;
  const today = r.series.at(-1);

  return (
    <section
      aria-labelledby="friction-card-title"
      className="grid gap-1 rounded-xl border border-border bg-card px-5 py-3"
    >
      <h2 id="friction-card-title" className="text-sm font-medium text-foreground">
        {r.scope === "workspace" ? t("cardTitleWorkspace") : t("cardTitle")}
      </h2>
      <p className="text-sm">
        {t("cardToday", { count: today?.prompts ?? 0 })}{" "}
        <span className={r.overBudget ? "font-medium text-orange-text" : "text-muted-foreground"}>
          {t("cardAverage", {
            avg: format.number(r.avgPromptsPerDeveloperPerDay),
            budget: r.budget,
          })}
        </span>
      </p>
      <Link href="/friction" className="link-text text-sm">
        {t("cardLink")}
      </Link>
    </section>
  );
}

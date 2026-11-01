import { getTranslations } from "next-intl/server";

import type { SharedSession } from "@/lib/insight/types";

/** The public, redacted copy of one session: programs, file types and site names only. */
export async function SharedSessionView({ session }: { session: SharedSession }) {
  const t = await getTranslations("insight.public");
  const s = await getTranslations("insight.sessions");
  return (
    <section className="grid gap-3 rounded-xl border border-(--report-line) bg-(--report-bg) p-4 text-(--report-text)">
      <h2 className="text-base font-medium">
        {t("title")} · {session.tool}
      </h2>
      <p className="text-xs text-(--report-muted)">{t("sessionNote")}</p>
      {session.source === "gap" && (
        <p className="text-xs text-(--report-muted)">{s("sourceGapHint")}</p>
      )}
      <h3 className="sr-only">{t("stepsTitle")}</h3>
      <ol className="grid gap-1.5">
        {session.steps.map((st, i) => {
          const named = st.text.length > 0;
          return (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-12 shrink-0 text-end text-xs text-(--report-muted) tabular-nums">
                {t("at", { seconds: st.t })}
              </span>
              <span>
                {t(
                  `text.${st.kind}${named || st.kind === "approval" || st.kind === "secret" ? "" : "None"}`,
                  {
                    name: st.text,
                  },
                )}
                {st.decision === "DENY" && ` · ${s("decision.DENY")}`}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

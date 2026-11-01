"use client";

import { useFormatter, useTranslations } from "next-intl";
import { KeyIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/manar/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** One row of the card. The secrets track maps its `secret.touched` events onto this. */
export interface SecretItem {
  id: string;
  /** blocked: Manar stopped it. waiting: needs the person. allowed: it went through. */
  state: "blocked" | "waiting" | "allowed";
  /** Display name of the AI tool, e.g. "Codex CLI". */
  tool: string;
  /** Already masked by the device, e.g. "~/code/shop/.env". Never a secret value. */
  maskedPath: string;
  /** Where it was headed, if the event says so, e.g. "pastebin.com". */
  destination?: string;
  /** ISO time. */
  at: string;
}

export interface SecretsCardProps {
  /** Undefined or empty shows the empty state. */
  items?: SecretItem[];
  isLoading?: boolean;
  /** Where the full timeline lives (the secrets track's page). */
  timelineHref?: string;
  /** Rows shown on Home. */
  limit?: number;
}

const STATE_STYLE = {
  blocked: { tone: "bg-deny-soft text-deny", glyph: "–" },
  waiting: { tone: "bg-wait-soft text-wait", glyph: "?" },
  allowed: { tone: "bg-allow-soft text-allow", glyph: "✓" },
} as const;

export function SecretsCard({
  items,
  isLoading,
  timelineHref = "/secrets",
  limit = 3,
}: SecretsCardProps) {
  const t = useTranslations("personal.secrets");
  const format = useFormatter();
  const rows = (items ?? []).slice(0, limit);

  return (
    <section className="grid content-start gap-3 rounded-xl border border-border bg-card p-4">
      <h3 className="flex items-baseline justify-between gap-2 text-base font-medium">
        {t("title")}
        <Link href={timelineHref} className="text-sm font-normal text-blue-text hover:underline">
          {t("timeline")}
        </Link>
      </h3>
      {isLoading ? (
        <div className="grid gap-2" aria-busy>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={KeyIcon} description={t("empty")} className="py-8" />
      ) : (
        <ul className="grid">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 border-t border-border py-2 text-sm first:border-t-0"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-[26px] place-items-center rounded-md text-sm font-bold",
                  STATE_STYLE[row.state].tone,
                )}
              >
                {STATE_STYLE[row.state].glyph}
              </span>
              <div className="min-w-0">
                <p className="break-words">
                  {row.tool} <span className="font-data text-xs">{row.maskedPath}</span>
                  {row.destination ? (
                    <>
                      {" "}
                      <span className="font-data text-xs">{row.destination}</span>
                    </>
                  ) : null}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t(row.state)} · {format.dateTime(new Date(row.at), { timeStyle: "short" })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

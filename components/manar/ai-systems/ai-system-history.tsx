"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";

import { Skeleton } from "@/components/ui/skeleton";
import { AiSystemLifecycleBadge } from "@/components/manar/ai-systems/ai-system-lifecycle-badge";
import { useUserNameResolver } from "@/components/manar/ai-systems/user-name";
import { useAiSystemTransitions, useAiSystemVersions } from "@/hooks/use-ai-systems";

/**
 * The record's two histories, side by side, because they answer different
 * questions and the API keeps them apart on purpose:
 *
 * - `GET /ai-systems/:id/versions` — every *material* change, each entry
 *   the governed field set exactly as it stood before the change that
 *   superseded it, plus who changed it and why.
 * - `GET /ai-systems/:id/transitions` — every *lifecycle* change, which
 *   `PATCH` cannot make. Together they are the evidence trail.
 */
export function AiSystemHistory({ aiSystemId }: { aiSystemId: string }) {
  const t = useTranslations("aiSystems.history");
  const format = useFormatter();
  const resolveUserName = useUserNameResolver();

  const versions = useAiSystemVersions(aiSystemId);
  const transitions = useAiSystemTransitions(aiSystemId);

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t("transitionsTitle")}</h2>
        <p className="mb-3 max-w-prose text-xs text-muted-foreground">{t("transitionsHint")}</p>

        {transitions.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : transitions.isError ? (
          <p className="text-sm text-destructive">{t("loadError")}</p>
        ) : (transitions.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("transitionsEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("transitionColumns.change")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("transitionColumns.reason")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("transitionColumns.actor")}
                  </th>
                  <th className="px-2 py-1.5 text-start font-medium">
                    {t("transitionColumns.at")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(transitions.data ?? []).map((transition, index) => (
                  <tr
                    key={`${transition.at}-${index}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <AiSystemLifecycleBadge state={transition.fromState} />
                        {/* Reading-order arrow, mirrored in RTL like every
                         * other directional glyph in this console. */}
                        <ArrowRightIcon
                          className="size-3.5 text-muted-foreground-tertiary rtl:-scale-x-100"
                          aria-hidden
                        />
                        <AiSystemLifecycleBadge state={transition.toState} />
                      </span>
                    </td>
                    <td className="max-w-sm px-2 py-1.5 text-xs text-muted-foreground">
                      {transition.reason}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">
                      {resolveUserName(transition.actorId)}
                    </td>
                    <td className="px-2 py-1.5 font-data text-xs text-muted-foreground">
                      {format.dateTime(new Date(transition.at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{t("versionsTitle")}</h2>
        <p className="mb-3 max-w-prose text-xs text-muted-foreground">{t("versionsHint")}</p>

        {versions.isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : versions.isError ? (
          <p className="text-sm text-destructive">{t("loadError")}</p>
        ) : (versions.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("versionsEmpty")}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {(versions.data ?? []).map((version) => (
              <li
                key={version.version}
                className="rounded-lg border border-border bg-card-raised p-3"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-data text-sm font-medium text-foreground">
                    {t("versionLabel", { version: version.version })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("changedBy")}: {resolveUserName(version.changedBy)}
                  </span>
                  <span className="font-data text-xs text-muted-foreground">
                    {format.dateTime(new Date(version.changedAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="mt-1 max-w-prose text-sm text-foreground">
                  <span className="text-muted-foreground">{t("changeReason")}: </span>
                  {version.changeReason}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {t("snapshotLabel")}
                  </summary>
                  {/* Forced LTR regardless of page locale: a raw JSON dump
                   * of the stored snapshot, not prose. Under dir="rtl" the
                   * bidi algorithm reorders these lines — same fix as the
                   * policy version viewer and the audit evidence block. */}
                  <pre
                    dir="ltr"
                    className="mt-1.5 max-h-72 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs"
                  >
                    {JSON.stringify(version.snapshot, null, 2)}
                  </pre>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

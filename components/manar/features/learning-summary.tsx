"use client";

import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAcceptSuggestion,
  useDismissSuggestion,
  useLearningSummary,
  useSetDeviceLearning,
} from "@/hooks/use-learning";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import { toolDisplayName } from "@/lib/personal/tool-stats";

/**
 * "Here is what Manar saw this week" (decision 36). A page the person opens, never a prompt: new
 * devices are watched, not asked, for 7 days, and what would have asked is listed here with one tap
 * to always allow each repeated, narrow case. The owner (or an admin, in a company) chooses.
 */
export function LearningSummary() {
  const t = useTranslations("features.learning");
  const format = useFormatter();
  const query = useLearningSummary();
  const accept = useAcceptSuggestion();
  const dismiss = useDismissSuggestion();
  const device = useSetDeviceLearning();

  // A role that may not see this simply sees no section.
  if (query.isError) return null;
  if (query.isLoading) return <Skeleton className="h-24 w-full" aria-busy />;
  const s = query.data;
  if (!s) return null;
  const learning = s.devices.filter((d) => d.learning.active);
  // Nothing learned, nothing learning, and learning is off: no section at all.
  if (!s.learning.enabled && s.totalWouldHaveAsked === 0 && s.suggestions.length === 0) return null;

  return (
    <section aria-labelledby="learning-title" className="grid gap-3">
      <div>
        <h2 id="learning-title" className="text-base font-medium">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {s.totalWouldHaveAsked > 0
            ? t("total", { count: s.totalWouldHaveAsked })
            : t("nothingYet")}
        </p>
      </div>

      {learning.length > 0 && (
        <ul className="grid gap-1.5 text-sm">
          {learning.map((d) => (
            <li key={d.hostId} className="flex flex-wrap items-center gap-2">
              <bdi className="font-medium">{cleanAgentText(d.hostname, 60).text}</bdi>
              <span className="text-muted-foreground">
                {d.learning.endsAt
                  ? t("until", {
                      date: format.dateTime(new Date(d.learning.endsAt), { dateStyle: "medium" }),
                    })
                  : t("learning")}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={device.isPending}
                onClick={() =>
                  device.mutate(
                    { hostId: d.hostId, action: "off" },
                    {
                      onSuccess: () => toast.success(t("stopped")),
                      onError: () => toast.error(t("failed")),
                    },
                  )
                }
              >
                {t("stop")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {s.suggestions.length > 0 && (
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">{t("suggestions")}</h3>
          <ul className="grid gap-2">
            {s.suggestions.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
              >
                <p className="max-w-prose text-sm">
                  {t.rich("suggestion", {
                    tool: toolDisplayName(g.toolId),
                    action: cleanAgentText(g.actionId, 40).text,
                    scope: cleanAgentText(g.scope, 120).text,
                    count: g.count,
                    res: (chunks) => <bdi className="font-mono">{chunks}</bdi>,
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={accept.isPending || dismiss.isPending}
                    onClick={() =>
                      accept.mutate(g.id, {
                        onSuccess: () => toast.success(t("accepted")),
                        onError: () => toast.error(t("failed")),
                      })
                    }
                  >
                    {t("accept")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={accept.isPending || dismiss.isPending}
                    onClick={() =>
                      dismiss.mutate(g.id, {
                        onSuccess: () => toast.message(t("dismissed")),
                        onError: () => toast.error(t("failed")),
                      })
                    }
                  >
                    {t("notNow")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

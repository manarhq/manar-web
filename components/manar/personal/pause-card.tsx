"use client";

import { useFormatter, useTranslations } from "next-intl";
import { PauseCircleIcon, PlayCircleIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { usePauseStatus, useSetPause } from "@/hooks/use-pause";

/**
 * "Pause all AI": one button that stops every protected tool on every device until someone
 * resumes it. While paused, the whole card turns into a red banner (shape and text, not colour
 * alone) with the Resume button. Nothing renders if the workspace state cannot be read, so a
 * missing role never shows a button that would fail.
 */
export function PauseCard() {
  const t = useTranslations("personal.pause");
  const format = useFormatter();
  const status = usePauseStatus();
  const set = useSetPause();
  if (!status.data) return null;
  const { paused, pausedAt } = status.data;

  const change = (next: boolean) =>
    set.mutate(next, {
      onSuccess: () => toast.success(next ? t("nowPaused") : t("nowResumed")),
      onError: () => toast.error(t("failed")),
    });

  return (
    <section
      aria-labelledby="pause-title"
      data-testid="pause-card"
      data-paused={paused}
      className={
        paused
          ? "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-deny bg-deny-soft px-5 py-3"
          : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3"
      }
    >
      <div className="flex items-start gap-3">
        {paused ? (
          <PauseCircleIcon aria-hidden weight="fill" className="mt-0.5 size-6 text-deny" />
        ) : (
          <PauseCircleIcon aria-hidden className="mt-0.5 size-6 text-muted-foreground" />
        )}
        <div>
          <h2 id="pause-title" className="text-sm font-medium text-foreground">
            {paused ? t("pausedTitle") : t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {paused
              ? pausedAt
                ? t("pausedSince", {
                    time: format.dateTime(new Date(pausedAt), { timeStyle: "short" }),
                  })
                : t("pausedBody")
              : t("body")}
          </p>
        </div>
      </div>
      {paused ? (
        <Button variant="primary" disabled={set.isPending} onClick={() => change(false)}>
          <PlayCircleIcon aria-hidden className="size-4" /> {t("resume")}
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={set.isPending}
          onClick={() => change(true)}
          className="border-deny text-deny hover:bg-deny-soft"
        >
          {t("pause")}
        </Button>
      )}
    </section>
  );
}

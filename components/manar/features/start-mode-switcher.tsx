"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/ssr";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { BffError } from "@/lib/api/raw";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useSetLearning,
  useSetStartMode,
  useStartMode,
  type StartMode,
} from "@/hooks/use-features";

const MODES: StartMode[] = ["watch", "ask", "strict"];

/** The three start-mode cards (mockup "First run"). One radio group; the choice saves at once. */
export function StartModeSwitcher() {
  const t = useTranslations("features.rules");
  const query = useStartMode();
  const set = useSetStartMode();
  const setLearning = useSetLearning();
  const current = query.data?.mode;

  if (query.isLoading) return <Skeleton className="h-24 w-full" aria-busy />;
  if (query.isError) {
    // Only the workspace owner and security admins can read or change this (manar-api).
    const noRole = query.error instanceof BffError && query.error.status === 403;
    return (
      <p
        role={noRole ? "note" : "alert"}
        className={noRole ? "text-sm" : "text-sm text-destructive"}
      >
        {noRole ? t("roleOnly") : t("loadFailed")}
      </p>
    );
  }

  return (
    <section aria-labelledby="start-mode-title" className="grid gap-3">
      <div>
        <h2 id="start-mode-title" className="text-base font-medium">
          {t("modeTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("modeHint")}</p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="start-mode-title"
        className="grid gap-3 md:grid-cols-3"
      >
        {MODES.map((mode) => {
          const selected = current === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={set.isPending}
              onClick={() =>
                !selected &&
                set.mutate(mode, {
                  onSuccess: () => toast.success(t("saved")),
                  onError: () => toast.error(t("failed")),
                })
              }
              className={`grid gap-1 rounded-lg border p-4 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                selected ? "border-brand bg-brand/10" : "border-border bg-card hover:bg-muted"
              }`}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {t(`modes.${mode}.name`)}
                {selected ? (
                  <CheckCircleIcon weight="fill" className="size-5 text-brand" aria-hidden />
                ) : (
                  mode === "ask" && (
                    <span className="text-xs font-normal text-brand">{t("modes.ask.badge")}</span>
                  )
                )}
              </span>
              <span className="text-sm text-muted-foreground">{t(`modes.${mode}.body`)}</span>
            </button>
          );
        })}
      </div>
      {current === "custom" && <p className="text-sm text-muted-foreground">{t("custom")}</p>}
      {query.data?.learning && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
          <Switch
            id="learning-switch"
            checked={query.data.learning.enabled}
            disabled={setLearning.isPending}
            onCheckedChange={(on) =>
              setLearning.mutate(on ? "on" : "off", {
                onSuccess: () => toast.success(t("saved")),
                onError: (e) =>
                  toast.error(
                    e instanceof BffError && e.status === 403 ? t("roleOnly") : t("failed"),
                  ),
              })
            }
            aria-label={t("learningTitle")}
            aria-describedby="learning-hint"
          />
          <div className="grid gap-0.5">
            <label htmlFor="learning-switch" className="text-sm font-medium">
              {t("learningTitle")}
            </label>
            <p id="learning-hint" className="max-w-prose text-sm text-muted-foreground">
              {t("learningBody", { days: query.data.learning.days })}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

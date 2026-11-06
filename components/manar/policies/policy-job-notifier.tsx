"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import { isClaimed, onJobTerminal, resumeTrackedJobs } from "@/lib/ai-stream/job-tracker";

/**
 * The "ready" notification for background policy drafts: whichever page the person is on, a toast
 * says when the draft is ready (with a button to open the policy), or that nothing was created.
 * Mounted once in the console shell. Jobs a dialog is showing itself are left to that dialog.
 */
export function PolicyJobNotifier() {
  const t = useTranslations("policies.suggest");
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    resumeTrackedJobs();
    return onJobTerminal((job) => {
      void queryClient.invalidateQueries({ queryKey: ["policies"] });
      if (isClaimed(job.id) || job.status === "cancelled") return;
      const made = job.status === "ready" && job.result?.available && job.result.policyId;
      if (made) {
        const query = job.result?.versionId ? `?version=${job.result.versionId}` : "";
        toast.success(t("readyToast"), {
          description: t("readyToastBody", { count: job.result?.ruleCount ?? 0 }),
          duration: 15_000,
          action: {
            label: t("openDraft"),
            onClick: () => router.push(`/policies/${job.result?.policyId}${query}`),
          },
        });
      } else if (job.status === "ready") {
        toast.message(t("unavailableToast"));
      } else {
        toast.error(job.error === "stalled" ? t("stalled") : t("failedToast"));
      }
    });
  }, [queryClient, router, t]);

  return null;
}

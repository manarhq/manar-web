"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ApprovalsListView } from "@/components/manar/approvals/approvals-list-view";
import { ApprovalsQueueView } from "@/components/manar/approvals/approvals-queue-view";
import { Button } from "@/components/ui/button";

/** Approvals: the waiting queue first (Midnight queue and context panel), the full history second. */
export function ApprovalsView() {
  const t = useTranslations("approvals.queue");
  const [tab, setTab] = useState<"waiting" | "history">("waiting");
  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label={t("tabsLabel")} className="flex gap-2">
        {(["waiting", "history"] as const).map((id) => (
          <Button
            key={id}
            role="tab"
            aria-selected={tab === id}
            variant={tab === id ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setTab(id)}
          >
            {t(id === "waiting" ? "tabWaiting" : "tabHistory")}
          </Button>
        ))}
      </div>
      {tab === "waiting" ? <ApprovalsQueueView /> : <ApprovalsListView />}
    </div>
  );
}

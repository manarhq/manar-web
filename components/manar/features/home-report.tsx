"use client";

import { useMemo, useState } from "react";

import { PersonalHome, type PersonalHomeProps } from "@/components/manar/personal/personal-home";
import { ShareReportDialog } from "@/components/manar/features/share-report-dialog";
import { useReportCard } from "@/hooks/use-features";
import { toWeeklyReport } from "@/lib/personal/report";

/** Personal Home fed with the weekly report card (and its share flow). */
export function HomeWithReport(props: Omit<PersonalHomeProps, "report" | "onShareReport">) {
  const card = useReportCard();
  const report = useMemo(() => (card.data ? toWeeklyReport(card.data) : undefined), [card.data]);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PersonalHome
        {...props}
        report={report}
        onShareReport={report ? () => setOpen(true) : undefined}
      />
      <ShareReportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

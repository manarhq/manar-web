"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { UsageBanner } from "@/components/manar/billing/billing-view";
import { DataNotice } from "@/components/manar/privacy/data-notice";
import { useUsage } from "@/hooks/use-billing";
import { ContactEmailForm } from "@/components/manar/growth/contact-email-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  useAutoJoinOffer,
  useCancelDeletion,
  useContactEmail,
  useDeletion,
  useJoinCompany,
} from "@/hooks/use-growth";

/**
 * What the growth track puts at the top of every page, when it applies: the first-run step for a
 * verified contact email (only when the sign-in address is the realm's placeholder), the "Join
 * <workspace>?" prompt, and the banner while an account deletion is scheduled. Each renders
 * nothing until its own answer says so, and an API error shows nothing.
 */
export function GrowthBanners({ billing = false }: { billing?: boolean }) {
  return (
    <div className="flex flex-col gap-3 empty:hidden">
      {billing && <SpendSafety />}
      <ScheduledDeletion />
      <ContactStep />
      <JoinPrompt />
      <DataNotice />
    </div>
  );
}

/** Spend safety on every page for whoever may see billing: 80%/100% of the allowance or cap. */
function SpendSafety() {
  const { data } = useUsage();
  return <UsageBanner usage={data} />;
}

function ContactStep() {
  const t = useTranslations("growth.contact");
  const { data } = useContactEmail();
  if (!data?.needsEmail) return null;
  return (
    <Alert>
      <AlertTitle>{t("firstRunTitle")}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span>{t("firstRunBody")}</span>
        <ContactEmailForm />
      </AlertDescription>
    </Alert>
  );
}

function JoinPrompt() {
  const t = useTranslations("growth.joinPrompt");
  const { data } = useAutoJoinOffer();
  const join = useJoinCompany();
  const [hidden, setHidden] = useState(false);
  if (!data?.offer || hidden || join.isSuccess) return null;
  return (
    <Alert>
      <AlertTitle>{t("title", { name: data.offer.name })}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>{t("body")}</span>
        <Button size="sm" disabled={join.isPending} onClick={() => join.mutate()}>
          {t("join")}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setHidden(true)}>
          {t("notNow")}
        </Button>
        {join.isError && <span role="alert">{t("error")}</span>}
      </AlertDescription>
    </Alert>
  );
}

function ScheduledDeletion() {
  const t = useTranslations("growth.account.banner");
  const format = useFormatter();
  const { data } = useDeletion();
  const cancel = useCancelDeletion();
  if (!data || (!data.scheduled && !data.refused)) return null;
  return (
    <Alert role="alert">
      <AlertDescription className="flex flex-wrap items-center gap-2">
        {data.scheduled ? (
          <>
            <span>
              {t("scheduled", {
                date: format.dateTime(new Date(data.executeAfter), { dateStyle: "long" }),
              })}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {t("cancel")}
            </Button>
          </>
        ) : (
          <>
            <span>{t("refused")}</span>
            <Link href="/settings/team" className="underline">
              {t("team")}
            </Link>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}

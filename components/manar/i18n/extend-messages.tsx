"use client";

import { useMemo, type ReactNode } from "react";
import { IntlProvider, useLocale, useMessages, useTimeZone } from "next-intl";

import { mergeMessages } from "@/i18n/pick-messages";

/** Adds a route area's messages to the ones the parent layouts already sent. */
export function ExtendMessages({
  messages,
  children,
}: {
  messages: Record<string, unknown>;
  children: ReactNode;
}) {
  const parent = useMessages();
  const locale = useLocale();
  const timeZone = useTimeZone();
  const merged = useMemo(
    () => mergeMessages(parent as Record<string, unknown>, messages),
    [parent, messages],
  );
  return (
    <IntlProvider locale={locale} messages={merged as never} timeZone={timeZone}>
      {children}
    </IntlProvider>
  );
}

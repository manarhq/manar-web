import type { ReactNode } from "react";
import { getMessages } from "next-intl/server";

import { pickMessages } from "@/i18n/pick-messages";
import generated from "@/i18n/route-messages.generated.json";
import { ExtendMessages } from "./extend-messages";

type Area = keyof typeof generated.areas | keyof typeof generated.groups;

/**
 * Sends a route area's client messages. The list is generated from what the area's components
 * read (scripts/route-messages.mjs); the root layout sends only `generated.base`.
 */
export async function RouteMessages({ area, children }: { area: Area; children: ReactNode }) {
  const paths =
    (generated.areas as Record<string, string[]>)[area] ??
    (generated.groups as Record<string, string[]>)[area] ??
    [];
  const messages = pickMessages(await getMessages(), paths);
  return <ExtendMessages messages={messages}>{children}</ExtendMessages>;
}

import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import { JoinInvite } from "@/components/manar/growth/join-invite";
import type { AppLocale } from "@/i18n/routing";

/** Signed-in only (proxy.ts redirects to login first); outside both shells because the invitee may have no workspace yet. */
export default async function JoinPage({ params }: PageProps<"/[locale]/join">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);
  return (
    <main className="px-4">
      <Suspense>
        <JoinInvite />
      </Suspense>
    </main>
  );
}

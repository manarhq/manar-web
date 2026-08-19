import { setRequestLocale } from "next-intl/server";

import { UsersListView } from "@/components/manar/users/users-list-view";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/auth/session.server";
import type { AppLocale } from "@/i18n/routing";

export default async function UsersPage({ params }: PageProps<"/[locale]/users">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  // proxy.ts already gates every (app) route behind a session — this is
  // defense-in-depth plus the actual source of the caller's own roles the
  // page needs for its client-side privilege-escalation UX (see
  // UsersListView's doc comment).
  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <UsersListView currentUserRoles={session.roles} currentUserSubject={session.subject} />;
}

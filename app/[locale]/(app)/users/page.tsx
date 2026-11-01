import { setRequestLocale } from "next-intl/server";

import { UsersListView } from "@/components/manar/users/users-list-view";
import { redirect } from "@/i18n/navigation";
import { getMe } from "@/lib/auth/me.server";
import type { AppLocale } from "@/i18n/routing";

export default async function UsersPage({ params }: PageProps<"/[locale]/users">) {
  const { locale } = await params;
  setRequestLocale(locale as AppLocale);

  // proxy.ts already gates every (app) route behind a session — this is
  // defense-in-depth plus the actual source of the caller's own roles the
  // page needs for its client-side privilege-escalation UX (see
  // UsersListView's doc comment).
  const me = await getMe();
  if (!me) {
    redirect({ href: "/login", locale });
    return null;
  }

  return <UsersListView currentUserRoles={me.roles} currentUserSubject={me.subject} />;
}

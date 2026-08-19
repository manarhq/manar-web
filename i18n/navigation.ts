import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/** Locale-aware wrappers around next/navigation + next/link, scoped to
 * `routing` above — always import these instead of the plain Next.js
 * versions inside app/[locale]/** so links/redirects keep their locale
 * prefix automatically. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

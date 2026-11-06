import type { ReactNode } from "react";

import { RouteMessages } from "@/components/manar/i18n/route-messages";

export default function Layout({ children }: { children: ReactNode }) {
  return <RouteMessages area="(app)/users">{children}</RouteMessages>;
}

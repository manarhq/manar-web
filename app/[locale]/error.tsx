"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { trackClientError } from "@/lib/telemetry/track";

/** Route error boundary. The telemetry event carries the route and the error's class name only. */
export default function LocaleError({ error, reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors.generic");
  const tCommon = useTranslations("common.actions");
  const pathname = usePathname();
  useEffect(() => trackClientError(pathname, error), [pathname, error]);
  return (
    <div role="alert" className="flex flex-col items-start gap-2 p-6">
      <h1 className="text-lg font-medium">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      <Button size="sm" variant="outline" onClick={reset}>
        {tCommon("retry")}
      </Button>
    </div>
  );
}

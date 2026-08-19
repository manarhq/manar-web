import { CheckIcon, MinusIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/manar/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROLES } from "@/lib/roles";

/**
 * `/roles` (Phase 14 design spec item 2): a read-oriented catalog of the
 * eight fixed roles this product ships with — substantially static
 * content, since there's no dynamic/custom role creation in this product
 * (design spec, "Out of scope"). Every capability/limitation listed here
 * reflects the real `@RequireRole(...)` gates across manar-api's
 * controllers as of this phase, not aspirational role scope — see
 * messages/{locale}/roles.json's `note` key, rendered below.
 */
export async function RolesView() {
  const t = await getTranslations("roles");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("title")} description={t("description")} />

      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        {t("note")}
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {ROLES.map((role, index) => {
          const capabilities = t.raw(`roles.${role}.capabilities`) as string[];
          const limitations = t.raw(`roles.${role}.limitations`) as string[];
          return (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{t(`roles.${role}.name`)}</CardTitle>
                    <CardDescription>{t(`roles.${role}.tagline`)}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">
                    #{index + 1}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {t("capabilitiesTitle")}
                  </span>
                  <ul className="flex flex-col gap-1">
                    {capabilities.map((capability) => (
                      <li key={capability} className="flex items-start gap-1.5 text-sm">
                        <CheckIcon
                          className="mt-0.5 size-3.5 shrink-0 text-risk-minimal"
                          aria-hidden
                        />
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {limitations.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {t("limitationsTitle")}
                    </span>
                    <ul className="flex flex-col gap-1">
                      {limitations.map((limitation) => (
                        <li
                          key={limitation}
                          className="flex items-start gap-1.5 text-sm text-muted-foreground"
                        >
                          <MinusIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">{t("privilegeOrderLabel")}</p>
    </div>
  );
}

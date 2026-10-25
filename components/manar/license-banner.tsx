"use client";

import { useFormatter, useTranslations } from "next-intl";
import { CertificateIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLicense, type TenantLicense } from "@/hooks/use-license";

type Status = TenantLicense["status"];

/** Which message a status shows; `null` shows no banner. */
export function bannerKind(
  license: Pick<TenantLicense, "status" | "deployment">,
): Exclude<Status, "valid" | "invalid_signature"> | "invalid" | null {
  switch (license.status) {
    case "valid":
      return null;
    // A deployment we run ourselves has no licence file; its tenants need no banner for that.
    case "missing":
      return license.deployment === "hosted" ? null : "missing";
    case "invalid_signature":
      return "invalid";
    default:
      return license.status;
  }
}

/**
 * The licence banner for tenant admins (manar-api docs/licensing.md). Licence limits are soft:
 * the copy says plainly that Manar keeps working. Shows nothing while loading, on an error, or
 * for a valid licence; the status is manar-api's, never computed here.
 */
export function LicenseBanner({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("common.license");
  const format = useFormatter();
  const { data } = useLicense(isAdmin);
  if (!isAdmin || !data) return null;
  const kind = bannerKind(data);
  if (!kind) return null;
  const date = data.expiresAt
    ? format.dateTime(new Date(data.expiresAt), { dateStyle: "medium" })
    : "";
  return (
    <Alert variant="warning" className="rounded-none border-x-0 border-t-0">
      <CertificateIcon aria-hidden />
      <AlertTitle>{t(`${kind}.title`)}</AlertTitle>
      <AlertDescription>
        {t(`${kind}.body`, { days: Math.max(data.daysLeft ?? 0, 0), date })} {t("keepsWorking")}{" "}
        {t("contact")}
      </AlertDescription>
    </Alert>
  );
}

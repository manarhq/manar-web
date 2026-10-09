"use client";

import { useTranslations } from "next-intl";
import { ShieldCheckIcon, ShieldWarningIcon } from "@phosphor-icons/react/ssr";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useAuditVerifyChain } from "@/hooks/use-audit";
import { apiErrorMessage } from "@/lib/api/errors";

/** Wired to the real `GET /audit/verify` (the same endpoint Phase 11a's
 * /overview tile already proved out) — recomputes every event's hash and
 * chain linkage server-side. */
export function ChainVerifyButton() {
  const t = useTranslations("audit.verify");
  const verify = useAuditVerifyChain();

  return (
    <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => verify.refetch()}
        disabled={verify.isFetching}
      >
        {verify.isFetching ? (
          t("checking")
        ) : (
          <>
            {verify.data?.valid === false ? (
              <ShieldWarningIcon className="text-deny" />
            ) : (
              <ShieldCheckIcon />
            )}
            {t("button")}
          </>
        )}
      </Button>
      {verify.isError && (
        <span className="text-xs text-destructive">{apiErrorMessage(verify.error)}</span>
      )}
      {verify.data && (
        <span className={verify.data.valid ? "text-xs text-allow" : "text-xs text-deny"}>
          {verify.data.valid ? (
            t("valid")
          ) : (
            <>
              {t("broken")}{" "}
              {verify.data.brokenAt && (
                <>
                  {t("brokenAt")}{" "}
                  <Link href={`/audit/${verify.data.brokenAt}`} className="underline">
                    {verify.data.brokenAt}
                  </Link>
                </>
              )}
            </>
          )}
        </span>
      )}
    </div>
  );
}

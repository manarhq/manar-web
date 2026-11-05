"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAllowGrants, useWithdrawGrant } from "@/hooks/use-allow-grants";
import { BffError } from "@/lib/api/raw";
import { cleanAgentText } from "@/lib/approvals/safe-text";
import { toolDisplayName } from "@/lib/personal/tool-stats";

/**
 * "Allowed without asking": every live permission that stops a prompt, with where it came from and
 * when it ends, and a Withdraw button. Shown to approvers only; anyone else gets a 403 and nothing.
 */
export function AllowGrantsList() {
  const t = useTranslations("features.rules");
  const format = useFormatter();
  const query = useAllowGrants();
  const withdraw = useWithdrawGrant();

  const heading = useRef<HTMLHeadingElement>(null);
  const [announce, setAnnounce] = useState("");

  // A role that may not see permissions (403), or an API without them (404), sees no section.
  // Any other failure says so: an empty-looking list would hide permissions that still apply.
  if (query.isError) {
    const status = query.error instanceof BffError ? query.error.status : 0;
    if (status === 403 || status === 404) return null;
    return (
      <p role="alert" className="text-sm text-destructive">
        {t("grantsLoadFailed")}
      </p>
    );
  }
  if (query.isLoading) return <Skeleton className="h-16 w-full" aria-busy />;
  const items = query.data ?? [];

  return (
    <section aria-labelledby="grants-title" className="grid gap-3">
      <div>
        <h2 id="grants-title" ref={heading} tabIndex={-1} className="text-base font-medium">
          {t("grantsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("grantsHint")}</p>
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("grantsEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("grantTool")}</TableHead>
              <TableHead>{t("grantDevice")}</TableHead>
              <TableHead>{t("grantScope")}</TableHead>
              <TableHead>{t("grantFrom")}</TableHead>
              <TableHead>{t("grantUntil")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("grantAction")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  {toolDisplayName(g.toolId)} <bdi className="font-mono">{g.actionId}</bdi>
                </TableCell>
                <TableCell>
                  <bdi>{cleanAgentText(g.hostName ?? "", 60).text}</bdi>
                </TableCell>
                <TableCell mono>
                  <bdi>{cleanAgentText(g.scope, 120).text}</bdi>
                </TableCell>
                <TableCell>{t(`grantOrigin.${g.origin}`)}</TableCell>
                <TableCell>
                  <time dateTime={g.expiresAt}>
                    {t("until", {
                      date: format.dateTime(new Date(g.expiresAt), { dateStyle: "medium" }),
                    })}
                  </time>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdraw.isPending}
                    aria-label={t("withdrawNamed", {
                      tool: toolDisplayName(g.toolId),
                      action: cleanAgentText(g.actionId, 40).text,
                      scope: cleanAgentText(g.scope, 120).text,
                    })}
                    onClick={() =>
                      withdraw.mutate(g.id, {
                        onSuccess: () => {
                          toast.success(t("withdrawn"));
                          setAnnounce(
                            t("withdrawnNamed", {
                              tool: toolDisplayName(g.toolId),
                              action: cleanAgentText(g.actionId, 40).text,
                              scope: cleanAgentText(g.scope, 120).text,
                            }),
                          );
                          // The button that was pressed is gone: land on the section heading.
                          heading.current?.focus();
                        },
                        onError: () => toast.error(t("withdrawFailed")),
                      })
                    }
                  >
                    {t("withdraw")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {query.hasNextPage && (
        <div>
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("showMore")}
          </Button>
        </div>
      )}
    </section>
  );
}

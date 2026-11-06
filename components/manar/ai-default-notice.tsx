"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { SparkleIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const KEY = ["ai-default-notice"];

/** `GET /tenant/settings` (owners and admins only) read for `aiDefaultNoticePending`; untyped on purpose until the API client is regenerated. */
function useNoticePending(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    enabled,
    staleTime: 15 * 60_000,
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/bff/tenant/settings");
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as {
        aiDefaultNoticePending?: boolean;
        aiOptInNoticePending?: boolean;
      };
      return body.aiDefaultNoticePending === true
        ? ("on" as const)
        : body.aiOptInNoticePending === true
          ? ("optIn" as const)
          : (null as null);
    },
  });
}

/**
 * Shown once to owners and admins after Manar switched AI on for an existing workspace (the 5 Nov
 * default). Dismissing clears it on the server, so nobody sees it again.
 */
export function AiDefaultNotice({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("common");
  const queryClient = useQueryClient();
  const { data } = useNoticePending(isAdmin);
  const dismiss = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/bff/tenant/settings/ai-default-notice/dismiss", {
        method: "POST",
      });
      if (!response.ok) throw new Error(String(response.status));
    },
    onSuccess: () => queryClient.setQueryData(KEY, null),
  });
  if (!isAdmin || !data) return null;
  const k = data === "on" ? "aiDefaultNotice" : "aiOptInNotice";
  return (
    <Alert className="rounded-none border-x-0 border-t-0">
      <SparkleIcon aria-hidden />
      <AlertTitle>{t(`${k}.title`)}</AlertTitle>
      <AlertDescription>
        <span>{t(`${k}.body`)} </span>
        <Link href="/settings/ai" className="underline">
          {t(`${k}.link`)}
        </Link>
        <Button
          size="xs"
          variant="outline"
          className="ms-3"
          disabled={dismiss.isPending}
          onClick={() => dismiss.mutate()}
        >
          {t(`${k}.dismiss`)}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

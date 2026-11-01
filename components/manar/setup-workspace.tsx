"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";

type State = "setting-up" | "none" | "failed";

export interface SetupWorkspaceProps {
  labels: { title: string; body: string; none: string; failed: string; signOut: string };
}

/**
 * Polls /api/workspace/refresh until the workspace is ready, then continues to the workspace home.
 * "none" means this account has no workspace at all (an administrator has to add it).
 */
export function SetupWorkspace({ labels }: SetupWorkspaceProps) {
  const locale = useLocale();
  const [state, setState] = useState<State>("setting-up");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch("/api/workspace/refresh", { method: "POST" });
        if (response.status === 401) {
          window.location.assign(`/${locale}/login`);
          return;
        }
        const body = (await response.json()) as { state?: string };
        if (cancelled) return;
        if (body.state === "ready") {
          window.location.assign(`/${locale}`);
          return;
        }
        if (body.state === "none") {
          setState("none");
          return;
        }
        setState("setting-up");
      } catch {
        if (!cancelled) setState("failed");
      }
      timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [locale]);

  return (
    <div role="status" aria-live="polite" className="flex max-w-sm flex-col items-center gap-4">
      {state === "setting-up" && (
        <>
          <CircleNotchIcon className="size-8 animate-spin text-muted-foreground motion-reduce:animate-none" />
          <h1 className="text-xl font-semibold text-foreground">{labels.title}</h1>
          <p className="text-sm text-balance text-muted-foreground">{labels.body}</p>
        </>
      )}
      {state === "none" && <p className="text-sm text-balance text-foreground">{labels.none}</p>}
      {state === "failed" && <p className="text-sm text-destructive">{labels.failed}</p>}
      {state !== "setting-up" && (
        <form method="POST" action="/api/auth/logout">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">
            {labels.signOut}
          </Button>
        </form>
      )}
    </div>
  );
}

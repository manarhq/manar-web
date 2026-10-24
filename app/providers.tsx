"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { PreferencesSync } from "@/components/manar/preferences/preferences-sync";

export interface ProvidersProps {
  children: ReactNode;
  /** next-themes storage key for the signed-in tenant — see
   * components/manar/preferences/preference-storage.ts. */
  themeStorageKey: string;
  /** CSP nonce for next-themes' inline script (proxy.ts). */
  nonce?: string;
}

/**
 * Client-side provider stack. Kept out of app/[locale]/layout.tsx (a
 * Server Component) so only this boundary pays the "use client" cost —
 * everything else in the tree stays server-rendered by default.
 *
 * - ThemeProvider: both themes are supported and the INITIAL one comes
 *   from the operator's own OS preference (`enableSystem` +
 *   `defaultTheme="system"`), which is what the console previously
 *   refused to do — it hard-set `defaultTheme="dark"` with
 *   `enableSystem={false}`, and app/[locale]/layout.tsx additionally
 *   pinned `dark` onto `<html>`, so the light palette was unreachable in
 *   practice. An explicit choice from the topbar's theme menu still wins
 *   and sticks: next-themes writes it to `storageKey`, and the pre-paint
 *   script in components/manar/preferences/preferences-script.tsx
 *   replays it on the next load before the browser paints, so there is
 *   no flash of the wrong theme and no hydration mismatch.
 *   `storageKey` is tenant-scoped for the same reason the UI store's key
 *   is (see preference-storage.ts): one origin serves every tenant.
 *   `disableTransitionOnChange` suppresses the colour-transition sweep
 *   when switching, which is a state change, not an animation worth
 *   watching.
 * - PreferencesSync: applies `html[data-density]` from the persisted UI
 *   store. Rendered here so it covers every route, including the login
 *   screen, which has no app shell.
 * - QueryClientProvider: TanStack Query owns all server state fetched
 *   through the generated API client (see lib/api/). One QueryClient per
 *   browser session via `useState` so it isn't recreated on every render
 *   but also isn't shared across requests on the server.
 */
export function Providers({ children, themeStorageKey, nonce }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={themeStorageKey}
      nonce={nonce}
      disableTransitionOnChange
    >
      <PreferencesSync />
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delay={200}>
          {children}
          <Toaster />
        </TooltipProvider>
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

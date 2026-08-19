"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Client-side provider stack. Kept out of app/[locale]/layout.tsx (a
 * Server Component) so only this boundary pays the "use client" cost —
 * everything else in the tree stays server-rendered by default.
 *
 * - ThemeProvider: dark-mode-first (Section 60) — `defaultTheme="dark"`,
 *   `enableSystem={false}` so the console doesn't silently follow an
 *   operator's OS light-mode preference; still toggleable per Section 58's
 *   "dark mode first", not "dark mode only".
 * - QueryClientProvider: TanStack Query owns all server state fetched
 *   through the generated API client (see lib/api/). One QueryClient per
 *   browser session via `useState` so it isn't recreated on every render
 *   but also isn't shared across requests on the server.
 */
export function Providers({ children }: { children: ReactNode }) {
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
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
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

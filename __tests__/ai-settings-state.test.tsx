import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiSettingsView } from "@/components/manar/settings/ai-settings-view";
import settingsEn from "@/messages/en/settings.json";
import settingsAr from "@/messages/ar/settings.json";
import commonEn from "@/messages/en/common.json";

vi.mock("@/lib/api/client", () => ({ apiClient: { GET: vi.fn(), PATCH: vi.fn() } }));
import { apiClient } from "@/lib/api/client";

afterEach(cleanup);

function renderView(allowExternalAi: boolean, locale: "en" | "ar") {
  vi.mocked(apiClient.GET).mockResolvedValue({
    data: { allowExternalAi, aiProvider: { provider: "azure_openai", isExternal: true } },
    response: new Response(),
  } as never);
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ settings: locale === "en" ? settingsEn : settingsAr, common: commonEn }}
    >
      <QueryClientProvider client={new QueryClient()}>
        <AiSettingsView />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("AI settings switch", () => {
  it.each([
    [true, "allowExternalAiOn"],
    [false, "allowExternalAiOff"],
  ] as const)("says its current state clearly (allowExternalAi=%s)", async (on, key) => {
    for (const [locale, ai] of [
      ["en", settingsEn.ai],
      ["ar", settingsAr.ai],
    ] as const) {
      renderView(on, locale);
      expect(await screen.findByTestId("allow-external-ai-state")).toHaveTextContent(ai[key]);
      expect(screen.getByText(ai.allowExternalAiDescription)).toBeInTheDocument();
      cleanup();
    }
  });
});

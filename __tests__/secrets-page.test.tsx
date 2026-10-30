import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SecretsPage } from "@/components/manar/personal/secrets-page";
import type { SecretEvent } from "@/hooks/use-secrets";
import emptyStateMessages from "@/messages/en/errors.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const base: SecretEvent = {
  id: "1",
  hostId: "h1",
  hostname: "laptop",
  type: "secret.touched",
  toolId: "host.cursor",
  process: "node",
  pathClass: "aws",
  maskedPath: "~/.aws/credentials",
  blocked: true,
  at: "2026-11-01T10:00:00Z",
};
const events: SecretEvent[] = [
  base,
  { ...base, id: "2", pathClass: "env", maskedPath: "~/code/shop/.env", blocked: false },
];

vi.mock("@/hooks/use-secrets", () => {
  const mutation = { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false };
  return {
    useSecretsTimeline: () => ({
      data: { pages: [{ items: events, nextCursor: null }] },
      isLoading: false,
      isError: false,
      hasNextPage: false,
    }),
    useSecretsOverview: () => ({
      data: {
        days: 7,
        tools: [
          {
            toolId: "host.cursor",
            touched: 2,
            blocked: 1,
            classes: { aws: 1, env: 1 },
            lastAt: "2026-11-01T10:00:00Z",
          },
        ],
        devices: [
          {
            hostId: "h1",
            hostname: "laptop",
            os: "linux",
            watcher: "monitoring unavailable",
            vault: [],
          },
        ],
        pendingAccess: 1,
      },
    }),
    useVaultAccess: () => ({
      data: [
        {
          id: "a1",
          hostId: "h1",
          kind: "aws",
          ref: "default",
          program: "terraform",
          createdAt: "2026-11-01T10:01:00Z",
        },
      ],
    }),
    useAccessDecision: () => mutation,
    useVaultAction: () => mutation,
  };
});

afterEach(cleanup);

function renderPage(locale: "en" | "ar", personal: unknown) {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ personal, errors: emptyStateMessages }}>
      <SecretsPage />
    </NextIntlClientProvider>,
  );
}

describe("SecretsPage", () => {
  it("offers the vault only for keys, shows the honest watcher label and the four answers", () => {
    renderPage("en", personalEn);
    expect(screen.getAllByRole("button", { name: /Protect in vault/ })).toHaveLength(1);
    expect(screen.getByText("Monitoring unavailable")).toBeInTheDocument();
    for (const name of ["Allow once", "Allow for 8 hours", "Always for this program", "Deny"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/~\/bin\/terraform · SHA-256 abababababab/)).toBeInTheDocument();
    expect(
      screen.getByText(/allowing it allows anything that runs through it/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Cursor opened ~\/\.aws\/credentials/).length).toBeGreaterThan(0);
  });

  it("renders in Arabic", () => {
    renderPage("ar", personalAr);
    expect(screen.getByText("المراقبة غير متاحة")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "رفض" })).toBeInTheDocument();
  });
});

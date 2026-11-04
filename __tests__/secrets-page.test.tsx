import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

const withdraw = vi.fn();

vi.mock("@/lib/auth/start-reauth", () => ({ startReauth: vi.fn() }));

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
            vault: [
              {
                id: "v1",
                hostId: "h1",
                kind: "ssh",
                ref: "id_ed25519",
                state: "AVAILABLE",
                detail: null,
              },
            ],
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
          programPath: "~/bin/terraform",
          programSha: "ab".repeat(32),
          createdAt: "2026-11-01T10:01:00Z",
          allowedDecisions: ["ALLOW_ONCE", "ALLOW_8H", "ALLOW_ALWAYS", "DENY"],
        },
        {
          id: "a2",
          hostId: "h1",
          kind: "file",
          ref: "ssh",
          program: "cursor-agent",
          programPath: "~/.local/share/cursor-agent/cursor-agent",
          programSha: "cd".repeat(32),
          createdAt: "2026-11-01T10:02:00Z",
          // A company approver's own device: another approver must allow it.
          allowedDecisions: ["DENY"],
          needs: "needs_another_admin",
        },
        {
          id: "a3",
          hostId: "h1",
          kind: "aws",
          ref: "prod",
          program: "aws",
          programPath: "/usr/bin/aws",
          programSha: "ef".repeat(32),
          createdAt: "2026-11-01T10:03:00Z",
          // A personal owner: once or 8 hours, after signing in again.
          allowedDecisions: ["ALLOW_ONCE", "ALLOW_8H", "DENY"],
          stepUpNeeded: true,
        },
      ],
    }),
    useVaultGrants: () => ({
      data: [
        {
          id: "g1",
          hostId: "h1",
          kind: "aws",
          ref: "default",
          program: "terraform",
          programPath: "~/bin/terraform",
          decision: "ALLOW_ALWAYS",
          decidedAt: "2026-11-01T10:05:00Z",
          until: null,
        },
      ],
    }),
    useWithdrawGrant: () => ({ ...mutation, mutate: withdraw }),
    useBlockMode: () => ({ data: { blockMode: "keys" }, isError: false }),
    useSetBlockMode: () => ({ ...mutation, variables: undefined }),
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
    expect(screen.getByRole("button", { name: "Move to vault" })).toBeInTheDocument();
    expect(screen.getByText(/manar-edge vault restore/)).toBeInTheDocument();
    expect(screen.getByText("Monitoring unavailable")).toBeInTheDocument();
    for (const name of ["Allow once", "Allow for 8 hours", "Always for this program", "Deny"]) {
      expect(screen.getAllByRole("button", { name })[0]).toBeInTheDocument();
    }
    expect(screen.getByText("cursor-agent wants to read your SSH keys")).toBeInTheDocument();
    const keysMode = screen.getByRole("radio", { name: /Block keys, ask me once/ });
    expect(keysMode).toBeChecked();
    expect(screen.getByRole("radio", { name: /Block all secret files/ })).not.toBeChecked();
    expect(screen.getByText(/~\/bin\/terraform · SHA-256 abababababab/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/allowing it allows anything that runs through it/)[0],
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Cursor opened ~\/\.aws\/credentials/).length).toBeGreaterThan(0);
  });

  it("offers only what the API allows: own device deny only, a personal owner signs in again, never always", () => {
    renderPage("en", personalEn);
    // a1 (someone else's device, company approver): everything. a2: deny only. a3: step-up.
    expect(screen.getAllByRole("button", { name: "Always for this program" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Allow once" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Deny" })).toHaveLength(3);
    expect(screen.getByText(/another approver must allow it/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm it is you" })).toBeInTheDocument();
  });

  it("lists standing permissions per device and withdraws one", () => {
    renderPage("en", personalEn);
    expect(screen.getByText("Standing permissions")).toBeInTheDocument();
    expect(screen.getByText(/terraform · aws: default/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw" }));
    expect(withdraw).toHaveBeenCalledWith("g1");
  });

  it("renders in Arabic", () => {
    renderPage("ar", personalAr);
    expect(screen.getByText("المراقبة غير متاحة")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "رفض" }).length).toBeGreaterThan(0);
    expect(screen.getByText("يريد cursor-agent قراءة مفاتيح SSH")).toBeInTheDocument();
  });
});

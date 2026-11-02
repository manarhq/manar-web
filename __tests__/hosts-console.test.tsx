import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HostsTab } from "@/components/manar/hosts/hosts-tab";
import { HostsView } from "@/components/manar/hosts/hosts-view";
import { InstallKeysTab } from "@/components/manar/hosts/install-keys-tab";
import { OrganisationTab, orgUnitTree } from "@/components/manar/hosts/organisation-tab";
import { RulesTab } from "@/components/manar/hosts/rules-tab";
import { apiErrorMessage } from "@/lib/api/errors";
import commonEn from "@/messages/en/common.json";
import hostsEn from "@/messages/en/hosts.json";

/**
 * Hosts console (F2c). What it must never do: offer a write to a read-only role, keep the raw
 * install key after the dialog closes, approve a rekey without naming the exact key, or hide an
 * API refusal.
 */

const h = vi.hoisted(() => ({
  hosts: vi.fn(),
  groups: vi.fn(),
  keys: vi.fn(),
  units: vi.fn(),
  rules: vi.fn(),
  decide: vi.fn(),
  create: vi.fn(),
  createReset: vi.fn(),
  createState: { data: undefined as unknown, error: null as unknown, isPending: false },
  saveUnit: vi.fn(),
  saveUnitState: { error: null as unknown },
}));
vi.mock("@/hooks/use-hosts", () => ({
  useHostsList: h.hosts,
  useHostGroups: h.groups,
  useInstallKeys: h.keys,
  useOrgUnits: h.units,
  useApprovalRules: h.rules,
  useHostDecision: () => ({ mutate: h.decide, isPending: false, isError: false, error: null }),
  useCreateInstallKey: () => ({ mutate: h.create, reset: h.createReset, ...h.createState }),
  useRevokeInstallKey: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useSaveHostGroup: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useSaveOrgUnit: () => ({ mutate: h.saveUnit, isPending: false, ...h.saveUnitState }),
  useSaveApprovalRule: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

const ok = <T,>(data: T) => ({ isPending: false, isError: false, data, refetch: vi.fn() });
const OLD = "a".repeat(64);
const NEW = "b".repeat(64);
const host = (over: Record<string, unknown> = {}) => ({
  id: "h-1",
  hostGroupId: "g-1",
  machineId: "m-1",
  hostname: "pc-01",
  os: "Windows 11",
  keyType: "TPM",
  status: "PENDING",
  approvedBy: null,
  approvedAt: null,
  lastSeenAt: null,
  registeredFromIp: "10.0.0.5",
  keyFingerprint: OLD,
  pendingKeyFingerprint: null,
  pendingHostGroupId: null,
  createdAt: "2026-10-28T08:00:00.000Z",
  ...over,
});
const group = { id: "g-1", name: "Finance PCs", orgUnitId: null };

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider
      locale="en"
      timeZone="UTC"
      messages={{ hosts: hostsEn, common: commonEn }}
    >
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  for (const f of [h.hosts, h.groups, h.keys, h.units, h.rules]) f.mockReset();
  h.decide.mockReset();
  h.create.mockReset();
  h.createReset.mockReset();
  h.saveUnit.mockReset();
  h.createState.data = undefined;
  h.saveUnitState.error = null;
  h.groups.mockReturnValue(ok([group]));
  h.units.mockReturnValue(ok([]));
  h.keys.mockReturnValue(ok([]));
  h.rules.mockReturnValue(ok([]));
  h.hosts.mockReturnValue({
    ...ok({ pages: [{ items: [host()], nextCursor: null }] }),
    hasNextPage: false,
  });
});
afterEach(cleanup);

const button = (name: RegExp | string) => screen.queryByRole("button", { name });

describe("role gating", () => {
  it("offers approve, reject and revoke to a write role", () => {
    wrap(<HostsTab canWrite />);
    expect(button("Approve")).toBeInTheDocument();
    expect(button("Reject")).toBeInTheDocument();
    expect(button("Revoke")).toBeInTheDocument();
  });

  it("shows an auditor no host action and says the page is read-only", () => {
    wrap(<HostsView roles={["AUDITOR"]} />);
    expect(screen.getByText(hostsEn.readOnlyNote)).toBeInTheDocument();
    expect(screen.getByText("pc-01")).toBeInTheDocument();
    for (const name of ["Approve", "Reject", "Revoke"])
      expect(button(name)).not.toBeInTheDocument();
  });

  it("titles the page with the nav label it was opened from", () => {
    wrap(<HostsView roles={["AUDITOR"]} title="Devices" />);
    expect(screen.getByRole("heading", { level: 1, name: "Devices" })).toBeInTheDocument();
    cleanup();
    wrap(<HostsView roles={["AUDITOR"]} />);
    expect(screen.getByRole("heading", { level: 1, name: hostsEn.title })).toBeInTheDocument();
  });

  it("hides every create and edit control from an auditor", () => {
    h.keys.mockReturnValue(
      ok([
        {
          id: "k-1",
          hostGroupId: "g-1",
          label: "Lab",
          allowedCidrs: [],
          maxUses: null,
          uses: 0,
          expiresAt: null,
          revokedAt: null,
          createdBy: "u",
          createdAt: "2026-10-28T08:00:00.000Z",
        },
      ]),
    );
    h.units.mockReturnValue(
      ok([{ id: "u-1", name: "HQ", parentId: null, externalId: null, source: "MANUAL" }]),
    );
    h.rules.mockReturnValue(
      ok([
        {
          id: "r-1",
          hostGroupId: null,
          hostnamePattern: "pc-*",
          cidrs: [],
          requireTpm: false,
          enabled: true,
        },
      ]),
    );
    wrap(
      <>
        <InstallKeysTab canWrite={false} />
        <OrganisationTab canWrite={false} />
        <RulesTab canWrite={false} />
      </>,
    );
    expect(screen.getByText("Lab")).toBeInTheDocument();
    for (const name of [/create/i, /^edit$/i, /^revoke$/i]) {
      expect(screen.queryAllByRole("button", { name })).toHaveLength(0);
    }
    expect(screen.getByRole("switch")).toHaveAttribute("aria-disabled", "true");
  });
});

describe("host list", () => {
  it("flags a software key and does not flag a TPM key", () => {
    h.hosts.mockReturnValue({
      ...ok({
        pages: [
          {
            items: [host({ keyType: "SOFTWARE" }), host({ id: "h-2", hostname: "pc-02" })],
            nextCursor: null,
          },
        ],
      }),
      hasNextPage: false,
    });
    wrap(<HostsTab canWrite />);
    expect(screen.getAllByText("Software key")).toHaveLength(1);
    expect(screen.getByText("TPM key")).toBeInTheDocument();
    expect(screen.getAllByText(hostsEn.selfReported).length).toBeGreaterThan(0);
  });

  it("shows the old and new key of a pending rekey", () => {
    h.hosts.mockReturnValue({
      ...ok({
        pages: [
          { items: [host({ pendingKeyFingerprint: NEW, status: "APPROVED" })], nextCursor: null },
        ],
      }),
      hasNextPage: false,
    });
    wrap(<HostsTab canWrite />);
    expect(screen.getByText("Key change pending")).toBeInTheDocument();
    expect(screen.getByText(/Current key: aaaaaaaaaaaa/)).toBeInTheDocument();
    expect(screen.getByText(/Requested key: bbbbbbbbbbbb/)).toBeInTheDocument();
  });

  it("approving a rekey sends exactly the pending fingerprint, after a confirm step", () => {
    h.hosts.mockReturnValue({
      ...ok({ pages: [{ items: [host({ pendingKeyFingerprint: NEW })], nextCursor: null }] }),
      hasNextPage: false,
    });
    wrap(<HostsTab canWrite />);
    fireEvent.click(button("Approve key change")!);
    expect(h.decide).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(NEW)).toBeInTheDocument();
    expect(within(dialog).getByText(OLD)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    expect(h.decide).toHaveBeenCalledTimes(1);
    expect(h.decide.mock.calls[0][0]).toEqual({
      id: "h-1",
      decision: "approve",
      keyFingerprint: NEW,
    });
  });

  it("approving a plain pending host sends no fingerprint; cancel sends nothing", () => {
    wrap(<HostsTab canWrite />);
    fireEvent.click(button("Approve")!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(h.decide).not.toHaveBeenCalled();
    fireEvent.click(button("Approve")!);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));
    expect(h.decide.mock.calls[0][0]).toEqual({
      id: "h-1",
      decision: "approve",
      keyFingerprint: undefined,
    });
  });

  it("removing needs the device name typed, and a double click sends one request", () => {
    wrap(<HostsTab canWrite />);
    fireEvent.click(button("Remove")!);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove pc-01?")).toBeInTheDocument();
    const go = within(dialog).getByRole("button", { name: "Confirm" });
    expect(go).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Device name" }), {
      target: { value: "pc-02" },
    });
    expect(go).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Device name" }), {
      target: { value: "pc-01" },
    });
    fireEvent.click(go);
    fireEvent.click(go);
    expect(h.decide).toHaveBeenCalledTimes(1);
    expect(h.decide.mock.calls[0][0]).toMatchObject({ id: "h-1", decision: "remove" });
  });

  it("a removed device offers no decision, says when, and offers re-enrol for 30 days", () => {
    const recent = new Date(Date.now() - 86_400_000).toISOString();
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    h.hosts.mockReturnValue({
      ...ok({
        pages: [
          {
            items: [
              host({ status: "REMOVED", removedAt: recent }),
              host({ id: "h-2", hostname: "pc-02", status: "REMOVED", removedAt: old }),
            ],
            nextCursor: null,
          },
        ],
      }),
      hasNextPage: false,
    });
    wrap(<HostsTab canWrite />);
    for (const name of ["Approve", "Reject", "Revoke", "Remove"])
      expect(button(name)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^Removed /)).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Re-enrol" })).toHaveLength(1);
  });

  it("shows a failed removal in words, never the raw server error", () => {
    expect(apiErrorMessage({ statusCode: 500, message: "Internal server error" }, "fb")).toBe("fb");
    expect(apiErrorMessage(new Error("Internal Server Error"), "fb")).toBe("fb");
    expect(apiErrorMessage({ statusCode: 409, message: "Already decided" }, "fb")).toBe(
      "Already decided",
    );
  });

  it("shows a failed read as an error, not as an empty fleet", () => {
    h.hosts.mockReturnValue({
      isPending: false,
      isError: true,
      error: { statusCode: 503, message: "down" },
      data: undefined,
      refetch: vi.fn(),
    });
    wrap(<HostsTab canWrite />);
    expect(screen.getByRole("alert")).toHaveTextContent("down");
    expect(screen.queryByText(hostsEn.hosts.empty)).not.toBeInTheDocument();
  });
});

describe("install key show-once", () => {
  const raw = "mik_acme_" + "x".repeat(43);

  it("shows the key once with a warning and copies it", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    h.createState.data = { id: "k-9", installKey: raw };
    h.keys.mockReturnValue(ok([]));
    wrap(<InstallKeysTab canWrite />);
    fireEvent.click(button("Create install key")!);
    expect(screen.getByTestId("install-key-value")).toHaveTextContent(raw);
    expect(screen.getByText(/You won't see this key again/)).toBeInTheDocument();
    fireEvent.click(button("Copy")!);
    expect(writeText).toHaveBeenCalledWith(raw);
  });

  it("resets the mutation on close and the key is gone from the page", () => {
    h.createState.data = { id: "k-9", installKey: raw };
    const { rerender } = wrap(<InstallKeysTab canWrite />);
    fireEvent.click(button("Create install key")!);
    fireEvent.click(button("I've stored it")!);
    expect(h.createReset).toHaveBeenCalled();
    h.createState.data = undefined;
    rerender(
      <NextIntlClientProvider
        locale="en"
        timeZone="UTC"
        messages={{ hosts: hostsEn, common: commonEn }}
      >
        <InstallKeysTab canWrite />
      </NextIntlClientProvider>,
    );
    expect(document.body.textContent).not.toContain(raw);
  });
});

describe("org units", () => {
  const units = [
    { id: "a", name: "HQ", parentId: null, externalId: null, source: "MANUAL" as const },
    { id: "b", name: "Finance", parentId: "a", externalId: null, source: "MANUAL" as const },
  ];

  it("orders a tree depth first and survives a cycle", () => {
    expect(orgUnitTree(units).map((u) => [u.name, u.depth])).toEqual([
      ["HQ", 0],
      ["Finance", 1],
    ]);
    const cyc = [
      { ...units[0], parentId: "b" },
      { ...units[1], parentId: "a" },
    ];
    expect(orgUnitTree(cyc)).toHaveLength(2);
  });

  it("shows the API's cycle refusal inline and keeps the dialog open", () => {
    h.units.mockReturnValue(ok(units));
    h.saveUnitState.error = { statusCode: 400, message: "cannot move an org unit under itself" };
    wrap(<OrganisationTab canWrite />);
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" }).at(-1)!);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "cannot move an org unit under itself",
    );
  });
});

describe("approval rules", () => {
  it("says key type and hostname are self-reported", () => {
    wrap(<RulesTab canWrite />);
    expect(screen.getByText(hostsEn.selfReported)).toBeInTheDocument();
  });
});

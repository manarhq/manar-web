import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddDeviceView } from "@/components/manar/add-device/add-device-view";
import type { Host } from "@/hooks/use-hosts";
import { detectOs, newPendingHost, oneLinerFor } from "@/lib/personal/add-device";
import addDeviceAr from "@/messages/ar/addDevice.json";
import addDeviceEn from "@/messages/en/addDevice.json";

const h = vi.hoisted(() => ({
  code: { data: undefined as unknown, isError: false, error: null as unknown, dataUpdatedAt: 0 },
  waiting: { data: null as unknown },
  setMode: vi.fn(),
  decide: vi.fn(),
}));
vi.mock("@/hooks/use-add-device", () => ({
  ApiProblem: class ApiProblem extends Error {
    constructor(
      readonly status: number,
      readonly body: Record<string, string>,
    ) {
      super("x");
    }
  },
  useInstallCode: () => ({ ...h.code, refetch: vi.fn() }),
  useSetStartMode: () => ({ mutate: h.setMode, isError: false }),
  useWaitingDevice: () => h.waiting,
}));
vi.mock("@/hooks/use-hosts", () => ({
  useHostDecision: () => ({ mutate: h.decide, isPending: false, isSuccess: false, isError: false }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const code = {
  code: "ABCDEFGH23",
  expiresAt: "2026-11-01T10:00:00Z",
  windows: "irm https://console-manar.vax.sh/i/ABCDEFGH23 | iex",
  linux: "curl -fsSL https://console-manar.vax.sh/i/ABCDEFGH23.sh | sudo sh",
};
const host = (over: Partial<Host>): Host =>
  ({
    id: "h1",
    hostname: "LAPTOP",
    os: "Windows 11 (windows)",
    status: "PENDING",
    createdAt: "2026-11-01T09:00:30Z",
    ...over,
  }) as Host;

function view(messages = addDeviceEn, locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={{ addDevice: messages }}>
      <AddDeviceView />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  h.code = { data: undefined, isError: false, error: null, dataUpdatedAt: 0 };
  h.waiting = { data: null };
  vi.clearAllMocks();
});

describe("add-device helpers", () => {
  it("tells Windows 11 from 10 by the platform version, and Linux", () => {
    const win = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130";
    expect(detectOs(win, "15.0.0")).toBe("windows11");
    expect(detectOs(win, "10.0.0")).toBe("windows10");
    expect(detectOs(win)).toBe("windows11");
    expect(detectOs("Mozilla/5.0 (X11; Linux x86_64) Firefox/130")).toBe("linux");
    expect(detectOs("Mozilla/5.0 (Linux; Android 14) Chrome/130")).toBe("windows11");
  });

  it("picks the line for the OS", () => {
    expect(oneLinerFor("windows10", code)).toBe(code.windows);
    expect(oneLinerFor("linux", code)).toBe(code.linux);
  });

  it("waits only for a PENDING host registered since the code was made", () => {
    const since = Date.parse("2026-11-01T09:00:00Z");
    const hosts = [
      host({ id: "old", createdAt: "2026-10-30T09:00:00Z" }),
      host({ id: "approved", status: "APPROVED" }),
      host({ id: "new" }),
    ];
    expect(newPendingHost(hosts, since)?.id).toBe("new");
    expect(newPendingHost(hosts.slice(0, 2), since)).toBeUndefined();
  });
});

describe("AddDeviceView", () => {
  it("saves the chosen start mode and shows the code, waiting and the sample link", () => {
    h.code.data = code;
    view();
    expect(screen.getByRole("radio", { name: /Ask me for risky things/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: /Strict/ }));
    expect(h.setMode).toHaveBeenCalledWith("strict", expect.anything());
    fireEvent.click(screen.getByRole("tab", { name: "Windows 11" }));
    expect(screen.getByText(code.windows)).toBeInTheDocument();
    expect(screen.getByText("Waiting for your device…")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sample data/ })).toHaveAttribute("href", "/sample");
    fireEvent.click(screen.getByRole("tab", { name: "Linux" }));
    expect(screen.getByText(code.linux)).toBeInTheDocument();
  });

  it("flips to Approve when the device registers", () => {
    h.code.data = code;
    h.waiting.data = host({});
    view();
    fireEvent.click(screen.getByRole("button", { name: "Approve this device" }));
    expect(h.decide).toHaveBeenCalledWith({ id: "h1", decision: "approve" });
    expect(screen.getByText("LAPTOP is here and waiting for you.")).toBeInTheDocument();
  });

  it("says so, with an upgrade link, when the plan has no free device", async () => {
    const { ApiProblem } = await import("@/hooks/use-add-device");
    h.code.isError = true;
    h.code.error = new ApiProblem(403, { code: "plan_limit_reached" });
    view();
    expect(screen.getByRole("alert")).toHaveTextContent("no free device");
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("has the same strings in Arabic and renders them", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      );
    expect(keys(addDeviceAr).sort()).toEqual(keys(addDeviceEn).sort());
    h.code.data = code;
    view(addDeviceAr, "ar");
    expect(screen.getByText("بانتظار جهازك…")).toBeInTheDocument();
  });
});

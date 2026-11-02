import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GrowthBanners } from "@/components/manar/growth/growth-banners";
import { JoinInvite } from "@/components/manar/growth/join-invite";
import growthEn from "@/messages/en/growth.json";

const h = vi.hoisted(() => ({
  useContactEmail: vi.fn(),
  useAutoJoinOffer: vi.fn(),
  useJoinCompany: vi.fn(),
  useDeletion: vi.fn(),
  useCancelDeletion: vi.fn(),
  useRequestContactCode: vi.fn(),
  useConfirmContactCode: vi.fn(),
  useAcceptInvite: vi.fn(),
  token: "tok-123456789",
}));
vi.mock("@/hooks/use-growth", () => h);
vi.mock("@/hooks/use-data-preferences", () => ({
  useDataPreferences: () => ({ data: undefined }),
  useSetDataPreferences: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ invite: h.token }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const idle = { mutate: vi.fn(), isPending: false, isError: false, isSuccess: false };
const wrap = (ui: React.ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={{ growth: growthEn }}>
      {ui}
    </NextIntlClientProvider>,
  );

function setup(over: Partial<Record<keyof typeof h, unknown>> = {}) {
  h.useContactEmail.mockReturnValue(over.useContactEmail ?? { data: { needsEmail: false } });
  h.useAutoJoinOffer.mockReturnValue(over.useAutoJoinOffer ?? { data: { offer: null } });
  h.useJoinCompany.mockReturnValue(over.useJoinCompany ?? idle);
  h.useDeletion.mockReturnValue(over.useDeletion ?? { data: { scheduled: false } });
  h.useCancelDeletion.mockReturnValue(idle);
  h.useRequestContactCode.mockReturnValue(idle);
  h.useConfirmContactCode.mockReturnValue(idle);
}

describe("GrowthBanners", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows nothing when nothing applies", () => {
    setup();
    const { container } = wrap(<GrowthBanners />);
    expect(container.textContent).toBe("");
  });

  it("asks for a contact email only when the sign-in address is the placeholder", () => {
    setup({ useContactEmail: { data: { needsEmail: true } } });
    wrap(<GrowthBanners />);
    expect(screen.getByText(growthEn.contact.firstRunTitle)).toBeTruthy();
  });

  it("asks before joining a company workspace, and joins only on Join", () => {
    const mutate = vi.fn();
    setup({
      useAutoJoinOffer: { data: { offer: { tenantId: "t", name: "Acme" } } },
      useJoinCompany: { ...idle, mutate },
    });
    wrap(<GrowthBanners />);
    expect(screen.getByText("Join Acme?")).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: growthEn.joinPrompt.join }));
    expect(mutate).toHaveBeenCalledOnce();
  });

  it("shows a banner with the date and a cancel while a deletion is scheduled", () => {
    setup({
      useDeletion: {
        data: { scheduled: true, executeAfter: "2026-11-09T00:00:00Z", requestedAt: "x" },
      },
    });
    wrap(<GrowthBanners />);
    expect(screen.getByRole("alert")).toHaveTextContent("November 9, 2026");
    expect(screen.getByRole("button", { name: growthEn.account.banner.cancel })).toBeTruthy();
  });

  it("tells the person when the deletion was stopped", () => {
    setup({ useDeletion: { data: { scheduled: false, refused: "sole_owner" } } });
    wrap(<GrowthBanners />);
    expect(screen.getByRole("alert")).toHaveTextContent(growthEn.account.banner.refused);
  });
});

describe("JoinInvite", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });
  it("does nothing on load: the person presses Accept", () => {
    const mutate = vi.fn();
    h.useAcceptInvite.mockReturnValue({ ...idle, mutate });
    wrap(<JoinInvite />);
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: growthEn.join.accept }));
    expect(mutate).toHaveBeenCalledWith(h.token);
  });
  it("sends a mismatched address to confirm their contact email", () => {
    h.useAcceptInvite.mockReturnValue({
      ...idle,
      isError: true,
      error: { message: "invite_email_mismatch" },
    });
    wrap(<JoinInvite />);
    expect(screen.getByRole("link", { name: growthEn.join.verifyEmail })).toHaveAttribute(
      "href",
      "/settings/profile",
    );
  });
});

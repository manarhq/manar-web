import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApprovalHandover } from "@/components/manar/approvals/approval-handover";
import approvalsEn from "@/messages/en/approvals.json";

/**
 * The approver's one-time temporary password (manar-api ADR-0011). What must hold:
 *  - nobody but the approving person sees the button, and only for actions that produce one;
 *  - the value is shown once, kept only in component state (no cache, no browser storage),
 *    and gone after the page is left;
 *  - a 404 (already collected, expired, not run yet) says so plainly and shows no value.
 */

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ apiClient: { POST: post } }));

function renderHandover(overrides: Partial<Parameters<typeof ApprovalHandover>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ approvals: approvalsEn }}>
      <ApprovalHandover
        approvalId="apr-1"
        actionName="entra.user.password.reset"
        approverUserId="user-1"
        viewerUserId="user-1"
        {...overrides}
      />
    </NextIntlClientProvider>,
  );
}

async function confirmShow() {
  fireEvent.click(screen.getByRole("button", { name: /show temporary password/i }));
  fireEvent.click(await screen.findByRole("button", { name: /show it now/i }));
}

let setItem: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  post.mockReset();
  setItem = vi.spyOn(Storage.prototype, "setItem");
});
afterEach(() => {
  cleanup();
  setItem.mockRestore();
});

describe("ApprovalHandover", () => {
  it("is not rendered for someone who did not approve the request", () => {
    renderHandover({ viewerUserId: "user-2" });
    expect(screen.queryByRole("button", { name: /show temporary password/i })).toBeNull();
    expect(screen.queryByText(/temporary password/i)).toBeNull();
  });

  it("is not rendered when the viewer cannot be identified", () => {
    renderHandover({ viewerUserId: null });
    expect(screen.queryByRole("button", { name: /show temporary password/i })).toBeNull();
  });

  it("is not rendered for actions that produce nothing to hand over", () => {
    renderHandover({ actionName: "entra.user.disable" });
    expect(screen.queryByRole("button", { name: /show temporary password/i })).toBeNull();
  });

  it("asks for confirmation, then shows the value once, masked until revealed, with nothing stored", async () => {
    post.mockResolvedValue({
      data: { approvalRequestId: "apr-1", value: { temporaryPassword: "Xk9!tempPass" } },
      response: { ok: true, status: 200 },
    });
    renderHandover();

    fireEvent.click(screen.getByRole("button", { name: /show temporary password/i }));
    expect(await screen.findByText(/you can see this once/i)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /show it now/i }));

    const field = await screen.findByLabelText("temporaryPassword");
    expect(field.textContent).not.toContain("Xk9!tempPass");
    fireEvent.click(screen.getByRole("button", { name: /reveal/i }));
    expect(field.textContent).toBe("Xk9!tempPass");

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/approvals/{id}/handover", {
      params: { path: { id: "apr-1" } },
    });
    expect(screen.queryByRole("button", { name: /show temporary password/i })).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("forgets the value when the page is left", async () => {
    post.mockResolvedValue({
      data: { approvalRequestId: "apr-1", value: { temporaryPassword: "Xk9!tempPass" } },
      response: { ok: true, status: 200 },
    });
    const { unmount } = renderHandover();
    await confirmShow();
    await screen.findByLabelText("temporaryPassword");
    unmount();

    renderHandover();
    expect(screen.queryByLabelText("temporaryPassword")).toBeNull();
    expect(screen.getByRole("button", { name: /show temporary password/i })).toBeTruthy();
  });

  it("says plainly that there is nothing to show on a 404, and shows no value", async () => {
    post.mockResolvedValue({
      data: undefined,
      error: { statusCode: 404 },
      response: { ok: false, status: 404 },
    });
    renderHandover();
    await confirmShow();

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/nothing to show/i));
    expect(screen.queryByLabelText("temporaryPassword")).toBeNull();
    expect(screen.queryByRole("button", { name: /show temporary password/i })).toBeNull();
  });
});

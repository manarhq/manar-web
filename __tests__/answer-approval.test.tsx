import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decisionOutcome, useAnswerApproval } from "@/hooks/use-answer-approval";
import { UNDO_MS, heldIds } from "@/lib/approvals/hold";
import approvalsAr from "@/messages/ar/approvals.json";
import approvalsEn from "@/messages/en/approvals.json";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const toastApi = vi.hoisted(() => {
  const fn = Object.assign(vi.fn(), {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  });
  return fn;
});
const reply = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock("sonner", () => ({ toast: toastApi }));
vi.mock("@/lib/api/raw", () => ({ bffJson: vi.fn(() => Promise.resolve(reply.current)) }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/telemetry/track", () => ({ track: vi.fn() }));
vi.mock("@/lib/push/subscribe", () => ({ enablePush: vi.fn(), shouldOfferPush: () => false }));

const FAR = new Date(Date.now() + 3_600_000).toISOString();

let seq = 0;
function setup(kind: "agent" | "host" = "agent", locale: "en" | "ar" = "en") {
  const id = `ap-${++seq}`; // held decisions are keyed by id and live across tests
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider
        locale={locale}
        messages={
          locale === "en"
            ? { personal: personalEn, approvals: approvalsEn }
            : { personal: personalAr, approvals: approvalsAr }
        }
      >
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  return Object.assign(
    renderHook(() => useAnswerApproval({ id, kind, expiresAt: FAR }), { wrapper }),
    { id },
  );
}

/** Answers, lets the 10 s hold run out, and lets the send settle. */
async function answerAndSettle(choice: "approve_once" | "deny", kind: "agent" | "host" = "agent") {
  const hook = setup(kind);
  act(() => {
    hook.result.current.answer(choice);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(UNDO_MS + 10);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(toastApi).forEach(
    (f) => typeof f === "function" && "mockClear" in f && f.mockClear(),
  );
});
afterEach(() => vi.useRealTimers());

describe("what the server says happened", () => {
  it("only APPROVED counts as approved; EXPIRED is its own outcome", () => {
    expect(decisionOutcome("APPROVED", false, true)).toBe("approved");
    expect(decisionOutcome("DENIED", false, true)).toBe("denied");
    expect(decisionOutcome("EXPIRED", false, true)).toBe("expired");
    expect(decisionOutcome("PENDING", false, true)).toBe("differs");
    expect(decisionOutcome("already-decided", true, true)).toBe("differs");
    // The choice stands in only for a device reply without a status (or "decided").
    expect(decisionOutcome(undefined, true, true)).toBe("approved");
    expect(decisionOutcome("decided", true, false)).toBe("denied");
    expect(decisionOutcome("decided", false, true)).toBe("differs");
  });
});

describe("the answer toast", () => {
  it("says 'Will approve in 10 s' while the answer is held, in English and Arabic", async () => {
    const en = setup();
    act(() => {
      en.result.current.answer("approve_once");
    });
    expect(toastApi.mock.calls.at(-1)?.[0]).toBe("Will approve in 10 s.");
    const ar = setup("agent", "ar");
    act(() => {
      ar.result.current.answer("deny");
    });
    expect(toastApi.mock.calls.at(-1)?.[0]).toBe(personalAr.approval.heldDenied);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS * 2); // let both sends settle before the next test
    });
  });

  it("an approval that EXPIRED does not say Approved", async () => {
    reply.current = { status: "EXPIRED" };
    await answerAndSettle("approve_once");
    expect(toastApi.success).not.toHaveBeenCalled();
    expect(toastApi.warning).toHaveBeenCalledWith(personalEn.approval.doneExpired);
  });

  it("APPROVED says approved; a lost race says the outcome differs", async () => {
    reply.current = { status: "APPROVED" };
    await answerAndSettle("approve_once");
    expect(toastApi.success).toHaveBeenCalledWith(personalEn.approval.doneApproved);

    toastApi.warning.mockClear();
    reply.current = { status: "DENIED" };
    await answerAndSettle("approve_once");
    expect(toastApi.warning).toHaveBeenCalledWith(approvalsEn.conflict.outcomeDiffers);
  });

  it("a device reply with no status falls back to the choice", async () => {
    reply.current = { note: null };
    await answerAndSettle("approve_once", "host");
    expect(toastApi.success).toHaveBeenCalledWith(personalEn.approval.doneApproved);
  });
});

describe("the answered item stays hidden until the request settles", () => {
  it("is still held after the 10 s, and released only once the send is done", async () => {
    let finish!: () => void;
    const { bffJson } = await import("@/lib/api/raw");
    vi.mocked(bffJson).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: "APPROVED" });
        }),
    );
    const hook = setup();
    act(() => {
      hook.result.current.answer("approve_once");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(UNDO_MS + 10);
    });
    expect(heldIds().has(hook.id)).toBe(true); // sent, not yet settled: still hidden
    await act(async () => {
      finish();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(heldIds().has(hook.id)).toBe(false);
  });
});

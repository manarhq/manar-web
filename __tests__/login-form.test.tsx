import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { LoginForm } from "@/components/manar/login-form";
import authEn from "@/messages/en/auth.json";

afterEach(cleanup);

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={{ auth: authEn }}>
      <LoginForm />
    </NextIntlClientProvider>,
  );
  return (["microsoft", "github", "email"] as const).map((m) =>
    screen.getByRole("button", { name: authEn.methods[m] }),
  );
}

describe("sign-in buttons", () => {
  it("each button submits its method with the form", () => {
    const [, github] = renderForm();
    const form = github!.closest("form")!;
    expect(form.getAttribute("action")).toBe("/api/auth/login");
    expect([...new FormData(form, github)]).toEqual([
      ["locale", "en"],
      ["method", "github"],
    ]);
  });

  // Regression (2 Nov 2026, every sign-in failed): on a real click React re-renders between the
  // submit event and the browser reading the form, and a `disabled` button's name/value is left
  // out, so /api/auth/login got no method. jsdom cannot reproduce that timing, so pin the cause:
  // after a click the buttons are only aria-disabled, never disabled.
  it("never disables the buttons once a sign-in starts", () => {
    const buttons = renderForm();
    const form = buttons[0]!.closest("form")!;
    form.addEventListener("submit", (e) => e.preventDefault()); // jsdom cannot navigate
    fireEvent.click(buttons[1]!);
    for (const b of buttons) {
      expect(b).not.toBeDisabled();
      expect(b).toHaveAttribute("aria-disabled", "true");
    }
  });

  it("ignores a second click while the first sign-in is on its way", () => {
    const buttons = renderForm();
    const form = buttons[0]!.closest("form")!;
    const prevented: boolean[] = [];
    // On document, so it runs after React's handler at the root.
    const onSubmit = (e: Event) => {
      if (e.target !== form) return;
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    document.addEventListener("submit", onSubmit);
    fireEvent.click(buttons[1]!);
    fireEvent.click(buttons[2]!);
    document.removeEventListener("submit", onSubmit);
    expect(prevented).toEqual([false, true]);
  });
});

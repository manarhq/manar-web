import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import commonAr from "@/messages/ar/common.json";
import commonEn from "@/messages/en/common.json";
import ApprovalsLoading from "@/app/[locale]/(app)/approvals/loading";
import HomeLoading from "@/app/[locale]/(personal)/home/loading";

const locale = vi.hoisted(() => ({ current: "en" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: "loading") =>
    (locale.current === "en" ? commonEn : commonAr)[key],
}));

afterEach(() => {
  cleanup();
  locale.current = "en";
});

describe("loading skeletons announce themselves", () => {
  for (const [name, Loading] of [
    ["approvals", ApprovalsLoading],
    ["home", HomeLoading],
  ] as const) {
    for (const lang of ["en", "ar"] as const) {
      it(`${name} (${lang}) is a status region with a visually hidden Loading text`, async () => {
        locale.current = lang;
        render(await Loading());
        const region = screen.getByRole("status");
        expect(region).toHaveAttribute("aria-busy", "true");
        const text = (lang === "en" ? commonEn : commonAr).loading;
        expect(region).toHaveTextContent(text);
        expect(screen.getByText(text)).toHaveClass("sr-only");
      });
    }
  }
});

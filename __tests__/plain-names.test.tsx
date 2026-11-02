/**
 * The console names Manar's parts in plain words (Network control, Approval prompts, Local
 * gateway, Signed record), never the internal code names, in both languages. Code identifiers
 * (`jail`, `warden`) are fine; only text a person reads is checked.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";

import { ProductName } from "@/components/manar/personal/product-name";
import { TooltipProvider } from "@/components/ui/tooltip";
import personalAr from "@/messages/ar/personal.json";
import personalEn from "@/messages/en/personal.json";

const CODE_NAMES =
  /\b(HUB|WARDEN|JAIL|DOOR|GATE|RULEBOOK|LEDGER|SEAL|INTAKE|SCOUT|INTEL|RINGS|TOWER|DESK|LENS)\b/;

function values(node: unknown, key = ""): Array<[string, string]> {
  if (typeof node === "string") return [[key, node]];
  if (node && typeof node === "object")
    return Object.entries(node).flatMap(([k, v]) => values(v, key ? `${key}.${k}` : k));
  return [];
}

afterEach(cleanup);

describe("plain names", () => {
  for (const locale of ["en", "ar"]) {
    it(`no ${locale} message uses an internal code name`, () => {
      const dir = join(__dirname, "..", "messages", locale);
      const hits = readdirSync(dir).flatMap((f) =>
        values(JSON.parse(readFileSync(join(dir, f), "utf8")))
          .filter(([, v]) => CODE_NAMES.test(v))
          .map(([k, v]) => `${f}:${k}: ${v}`),
      );
      expect(hits).toEqual([]);
    });
  }

  it("shows the plain name, and explains it on keyboard focus", async () => {
    render(
      <NextIntlClientProvider locale="en" messages={{ personal: personalEn }}>
        <TooltipProvider delay={0}>
          <ProductName product="jail" />
        </TooltipProvider>
      </NextIntlClientProvider>,
    );
    const term = screen.getByText("Network control");
    expect(term).toHaveAttribute("tabindex", "0");
    fireEvent.focus(term);
    expect(
      await screen.findByText("Keeps your command-line AI tools to the sites you allowed."),
    ).toBeInTheDocument();
  });

  it("has an Arabic name and explanation for every part", () => {
    for (const key of Object.keys(personalEn.products) as (keyof typeof personalEn.products)[]) {
      expect(personalAr.products[key].name).toBeTruthy();
      expect(personalAr.products[key].explain).toBeTruthy();
    }
  });
});

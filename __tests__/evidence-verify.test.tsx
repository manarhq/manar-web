import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EvidenceVerifyDialog,
  parseEvidenceFile,
} from "@/components/manar/audit/evidence-verify-dialog";
import auditEn from "@/messages/en/audit.json";
import commonEn from "@/messages/en/common.json";

/** POST /evidence/verify from the console: the verdict is manar-api's, and
 * "does not verify" is shown as such, with its reason. */

const post = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/client", () => ({ apiClient: { POST: post } }));

const exported = {
  exportId: "x1",
  bundle: { events: [{ eventId: "e1" }] },
  signature: { bundleHash: "h", signature: "jwt.value.sig", algorithm: "HS256" },
};

function renderDialog() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <NextIntlClientProvider locale="en" messages={{ audit: auditEn, common: commonEn }}>
        <EvidenceVerifyDialog />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByText(auditEn.verifyBundle.button));
}

function upload(content: string) {
  const input = screen.getByLabelText(auditEn.verifyBundle.fileLabel);
  fireEvent.change(input, {
    target: { files: [new File([content], "bundle.json", { type: "application/json" })] },
  });
}

afterEach(() => {
  cleanup();
  post.mockReset();
});

describe("evidence bundle verification", () => {
  it("sends the bundle and the JWT signature, and shows a valid verdict", async () => {
    post.mockResolvedValue({ data: { valid: true } });
    renderDialog();
    upload(JSON.stringify(exported));

    await screen.findByText(auditEn.verifyBundle.valid);
    expect(post).toHaveBeenCalledWith("/evidence/verify", {
      body: { bundle: exported.bundle, signature: "jwt.value.sig" },
    });
  });

  it("shows a failed verification with its reason, never as valid", async () => {
    post.mockResolvedValue({ data: { valid: false, reason: "bundle_hash_mismatch" } });
    renderDialog();
    upload(JSON.stringify(exported));

    await screen.findByText("bundle_hash_mismatch");
    expect(screen.queryByText(auditEn.verifyBundle.valid)).toBeNull();
  });

  it("rejects a file that is not an exported bundle without calling the API", async () => {
    renderDialog();
    upload(JSON.stringify({ hello: "world" }));

    await screen.findByText(auditEn.verifyBundle.notABundle);
    await waitFor(() => expect(post).not.toHaveBeenCalled());
  });

  it("parses only well-formed export files", () => {
    expect(parseEvidenceFile("not json")).toBeNull();
    expect(parseEvidenceFile(JSON.stringify({ bundle: {}, signature: "flat" }))).toBeNull();
    expect(parseEvidenceFile(JSON.stringify(exported))?.signature).toBe("jwt.value.sig");
  });
});

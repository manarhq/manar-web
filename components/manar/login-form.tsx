"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthErrorKey =
  | "tenantSlugRequired"
  | "tenantSlugInvalidFormat"
  | "tenantNotFound"
  | "callbackFailed"
  | "sessionExpired";

export interface LoginFormProps {
  errorKey?: AuthErrorKey;
}

/**
 * Step 1 of the login flow (see docs/auth-flow.md): a plain, progressively
 * enhanced HTML form that POSTs straight to /api/auth/login — no client
 * fetch needed, since the response is itself a redirect (first to
 * Keycloak's real login page, never a form Manar renders itself). This
 * form collects a workspace ID only, never a password.
 */
export function LoginForm({ errorKey }: LoginFormProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    setSubmitting(true);
  }

  return (
    <form
      method="POST"
      action="/api/auth/login"
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tenantSlug">{t("tenantSlugLabel")}</Label>
        <Input
          id="tenantSlug"
          name="tenantSlug"
          placeholder={t("tenantSlugPlaceholder")}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          pattern="[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
          required
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">{t("tenantSlugHint")}</p>
      </div>

      {errorKey && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t(`errors.${errorKey}`)}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t("continuingButton") : t("continueButton")}
      </Button>
    </form>
  );
}
